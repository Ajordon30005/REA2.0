"""Value operations shared by analysis and execution. No replacement HCL math.

The Boolean gates are the compositions in Marvosa hcl_stack/hcl_bitwise.py.
Word unpacking/packing is a representation boundary, as in that original file;
the gates and weighted accumulation execute through HCLTranscriber. JavaScript
words are 32 bits because that is the source language's bitwise contract.
"""
from dataclasses import dataclass

import hcl_engine as engine
from .trace import TraceBuffer


@dataclass(frozen=True)
class Number:
    value: int


class Unsupported(ValueError):
    """A source operation has no implemented substrate arrangement yet."""


PRIMITIVES = {
    "+": "COMP", "-": "COMP/SHIFT", "*": "AMP_MOD", "/": "AMP_MOD/INV",
    "**": "AMP_MOD power", "neg": "SHIFT", "sqrt": "FISSION",
    "exp": "MOBIUS_GROWTH", "log": "LOG_EXTRACT", "ln": "LOG_EXTRACT",
    "sin": "PHASE_SIN", "cos": "PHASE_COS", "%": "COMP/SHIFT quotient-remainder",
    "//": "COMP/SHIFT quotient-remainder", "&": "AMP_MOD Boolean gates",
    "|": "COMP/SHIFT/AMP_MOD Boolean gates", "^": "COMP/SHIFT/AMP_MOD Boolean gates",
    "~": "COMP/SHIFT Boolean gates", "<<": "bit permutation/COMP/AMP_MOD",
    ">>": "bit permutation/COMP/AMP_MOD", ">>>": "bit permutation/COMP/AMP_MOD",
    "==": "COMP/SHIFT comparison", "!=": "COMP/SHIFT comparison",
    "===": "COMP/SHIFT comparison", "!==": "COMP/SHIFT comparison",
    "<": "COMP/SHIFT comparison", "<=": "COMP/SHIFT comparison",
    ">": "COMP/SHIFT comparison", ">=": "COMP/SHIFT comparison",
}


def input_value(value):
    """Only the transport boundary may convert decimal tokens to the lattice."""
    from decimal import Decimal
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return value
    if isinstance(value, (int, Decimal)):
        return Number(engine.HCLTranscriber.to_fp(value if isinstance(value, int) else str(value)))
    if isinstance(value, list):
        return [input_value(item) for item in value]
    if isinstance(value, dict):
        return {key: input_value(item) for key, item in value.items()}
    raise Unsupported("Unsupported boundary value: " + type(value).__name__)


def output_value(value):
    if isinstance(value, Number):
        return {"type": "number", "integer": str(value.value),
                "scale": str(engine.SCALE),
                "decimal": engine.HCLTranscriber.from_fp(value.value)}
    if isinstance(value, (list, tuple)):
        return [output_value(item) for item in value]
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            return {"type": "map", "entries": [[output_value(key), output_value(item)] for key, item in value.items()]}
        return {str(key): output_value(item) for key, item in value.items()}
    if isinstance(value, (str, bool)) or value is None:
        return value
    raise Unsupported("A callable or opaque value cannot cross the JSON boundary")


class Kernel:
    def __init__(self):
        self.t = engine.HCLTranscriber()
        self.t.braid_log = TraceBuffer("generator")
        self.origins = TraceBuffer("source")

    def number(self, text):
        if isinstance(text, str) and text.lstrip("+-").isdigit():
            text = int(text)
        return Number(self.t.to_fp(text))

    def record(self, start, source):
        if len(self.t.braid_log) != start:
            self.origins.append({"source": source, "start": start,
                                 "end": len(self.t.braid_log)})

    def braid(self):
        return self.t.braid_log.packed()

    def braid_sources(self):
        return self.origins.packed()

    @staticmethod
    def numeric(value):
        if not isinstance(value, Number):
            raise Unsupported("Numeric operation requires a finite HCL number")
        return value.value

    @staticmethod
    def integer(value):
        x = Kernel.numeric(value)
        if x % engine.SCALE:
            raise Unsupported("An integral value is required at this index/word boundary")
        return x // engine.SCALE

    @staticmethod
    def truth(value, language):
        if isinstance(value, Number):
            return value.value != 0
        if language == "javascript" and isinstance(value, (list, dict)):
            return True
        return bool(value)

    def quotient(self, x, y):
        """Nonnegative integer quotient, lattice remainder; native doubling/subtraction.

        Do not round a reciprocal-based HCL division to obtain a quotient: the
        reciprocal may be one lattice unit below an exact integer boundary.
        This is ordinary binary long division arranged from COMP/SHIFT only.
        """
        if y == 0:
            raise ValueError("Division by zero")
        x = self.t.neg(x) if x < 0 else x
        y = self.t.neg(y) if y < 0 else y
        steps = []
        weight = engine.SCALE
        while y <= x:
            steps.append((y, weight))
            y = self.t.add(y, y)
            weight = self.t.add(weight, weight)
        q = 0
        for divisor, weight in reversed(steps):
            if x >= divisor:
                x = self.t.sub(x, divisor)
                q = self.t.add(q, weight)
        return q, x

    def word(self, op, left, right, language, *, width=None, signed=True):
        if language == "javascript":
            if self.numeric(left) % engine.SCALE:
                left = self.function("trunc", [left])
            if right is not None and self.numeric(right) % engine.SCALE:
                right = self.function("trunc", [right])
        a = self.integer(left)
        b = self.integer(right) if right is not None else 0
        width = width or (32 if language == "javascript" else max(a.bit_length(), b.bit_length()) + 2)
        if op in ("<<", ">>", ">>>", "rotl", "rotr"):
            if language == "javascript":
                b &= 31
            elif language == "wasm":
                b %= width
            elif b < 0:
                raise ValueError("Negative shift count")
            if op == "<<" and language == "python":
                width += b
        # The original stack also unpacks integral words at this boundary.
        aa = [engine.SCALE if (a >> i) & 1 else 0 for i in range(width)]
        bb = [engine.SCALE if (b >> i) & 1 else 0 for i in range(width)]
        if op in ("clz", "ctz", "popcnt"):
            count = 0
            for bit in reversed(aa) if op == "clz" else aa:
                if op == "popcnt":
                    count = self.t.add(count, bit)
                elif bit:
                    break
                else:
                    count = self.t.add(count, engine.SCALE)
            return Number(count)
        bits = []
        for i in range(width):
            x, y = aa[i], bb[i]
            if op == "&":
                bit = self.t.mul(x, y)
            elif op == "|":
                bit = self.t.sub(self.t.add(x, y), self.t.mul(x, y))
            elif op == "^":
                bit = self.t.sub(self.t.add(x, y), self.t.mul(2 * engine.SCALE, self.t.mul(x, y)))
            elif op == "~":
                bit = self.t.sub(engine.SCALE, x)
            elif op == "<<":
                bit = aa[i - b] if i >= b else 0
            elif op in (">>", ">>>"):
                bit = aa[i + b] if i + b < width else (aa[-1] if op == ">>" else 0)
            elif op in ("rotl", "rotr"):
                bit = aa[(i - b if op == "rotl" else i + b) % width]
            else:
                raise Unsupported("Unknown word operation: " + op)
            bits.append(bit)
        value = 0
        for i, bit in enumerate(bits):
            value = self.t.add(value, self.t.mul(bit, self.t.to_fp(1 << i)))
        if signed and bits[-1] and op != ">>>":
            value = self.t.sub(value, self.t.to_fp(1 << width))
        return Number(value)

    def binary(self, op, left, right, language="python", source=None):
        start = len(self.t.braid_log)
        try:
            if language == "python" and isinstance(left, (Number, bool)) and isinstance(right, (Number, bool)):
                left = self.number(int(left)) if isinstance(left, bool) else left
                right = self.number(int(right)) if isinstance(right, bool) else right
            if op in ("&", "|", "^", "<<", ">>", ">>>"):
                return self.word(op, left, right, language)
            if op in ("==", "!=", "===", "!==", "<", "<=", ">", ">="):
                if isinstance(left, Number) and isinstance(right, Number):
                    delta = self.t.sub(left.value, right.value)
                    a, b = delta, 0
                elif isinstance(left, (str, bool, type(None))) and isinstance(right, type(left)):
                    a, b = left, right
                elif op in ("==", "!=", "===", "!=="):
                    if language == "javascript" and op in ("==", "!=") and type(left) is not type(right):
                        raise Unsupported("JavaScript coercive equality requires a value-conversion adapter")
                    if language == "python" and isinstance(left, (list, tuple, dict)) and isinstance(right, type(left)):
                        raise Unsupported("Structural container equality is not yet lowered")
                    equal = left is right
                    return equal if op in ("==", "===") else not equal
                else:
                    raise Unsupported("Comparison between incompatible source values")
                return {"==": lambda: a == b, "===": lambda: a == b,
                        "!=": lambda: a != b, "!==": lambda: a != b,
                        "<": lambda: a < b, "<=": lambda: a <= b,
                        ">": lambda: a > b, ">=": lambda: a >= b}[op]()
            if op == "+" and isinstance(left, str) and isinstance(right, str):
                return left + right
            if language == "python" and op == "+" and isinstance(left, list) and isinstance(right, list):
                return left + right
            if op == "*" and isinstance(left, (str, list)):
                return left * self.integer(right)
            x, y = self.numeric(left), self.numeric(right)
            if op in ("+", "-", "*", "/"):
                if op == "/" and y == 0:
                    raise ValueError("Division by zero")
                return Number({"+": self.t.add, "-": self.t.sub,
                               "*": self.t.mul, "/": self.t.div}[op](x, y))
            if op in ("%", "//"):
                q, r = self.quotient(x, y)
                opposite = (x < 0) != (y < 0)
                if opposite:
                    q = self.t.neg(q)
                if x < 0:
                    r = self.t.neg(r)
                if language == "python" and opposite and r != 0:
                    q = self.t.sub(q, engine.SCALE)
                    r = self.t.add(r, y)
                return Number(q if op == "//" else r)
            if op == "**":
                if y % engine.SCALE == 0:
                    if x == 0 and y < 0:
                        raise ValueError("Zero to negative power")
                    return Number(self.t.pow_int(x, y // engine.SCALE))
                if x <= 0:
                    raise ValueError("Fractional power requires a positive real base")
                return Number(self.t.exp(self.t.mul(y, self.t.ln(x))))
            raise Unsupported("Unsupported value operation: " + op)
        finally:
            self.record(start, source)

    def unary(self, op, value, language="python", source=None):
        start = len(self.t.braid_log)
        try:
            if op in ("!", "not"):
                return not self.truth(value, language)
            if op == "~":
                return self.word(op, value, None, language)
            if op == "+":
                self.numeric(value)
                return value
            if op in ("-", "neg"):
                return Number(self.t.neg(self.numeric(value)))
            raise Unsupported("Unsupported unary operation: " + op)
        finally:
            self.record(start, source)

    def function(self, name, values, source=None):
        start = len(self.t.braid_log)
        try:
            if name in ("min", "max"):
                items = values[0] if len(values) == 1 and isinstance(values[0], (list, tuple)) else values
                if not items:
                    raise ValueError(name + " requires values")
                best = items[0]
                for item in items[1:]:
                    if self.binary("<" if name == "min" else ">", item, best):
                        best = item
                return best
            if name == "pow":
                return self.binary("**", *values, source=source)
            if len(values) != 1:
                raise Unsupported("Expected one argument for " + name)
            x = self.numeric(values[0])
            if name == "abs":
                return Number(self.t.neg(x) if x < 0 else x)
            if name in ("int", "trunc", "floor", "ceil"):
                q, r = self.quotient(x, engine.SCALE)
                if x < 0:
                    q = self.t.neg(q)
                if name == "floor" and x < 0 and r:
                    q = self.t.sub(q, engine.SCALE)
                if name == "ceil" and x > 0 and r:
                    q = self.t.add(q, engine.SCALE)
                return Number(q)
            if name in ("sin", "cos"):
                phase = self.t.div(x, self.t.add(engine.PI_INT, engine.PI_INT)) % engine.SCALE
                return Number(getattr(self.t, name)(phase))
            if name == "sqrt" and x < 0 or name in ("log", "ln") and x <= 0:
                raise ValueError("Outside real scalar domain: " + name)
            method = "ln" if name == "log" else name
            if method not in ("sqrt", "exp", "ln"):
                raise Unsupported("Unsupported HCL function: " + name)
            return Number(getattr(self.t, method)(x))
        finally:
            self.record(start, source)
