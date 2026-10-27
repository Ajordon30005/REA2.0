"""JavaScript object storage and typed-array views; no target computation here.

Property descriptors have one owner. The runtime invokes getters/setters through
the graph, and all numerical conversion stays with the shared HCL Kernel.
"""
from dataclasses import dataclass, field


@dataclass
class Property:
    value: object = None
    getter: object = None
    setter: object = None
    accessor: bool = False
    writable: bool = False
    enumerable: bool = False
    configurable: bool = False


@dataclass(eq=False)
class JSObject:
    properties: dict = field(default_factory=dict)
    prototype: object = None


class JSArray(list):
    def __init__(self, values=()):
        super().__init__(values)
        self.properties = JSObject()


class TypedArray(JSArray):
    def __init__(self, values, width, signed, *, storage=None, offset=0, length=None):
        super().__init__()
        self.width = width
        self.signed = signed
        self.storage = list(values) if storage is None else storage
        self.offset = offset
        self.length = len(self.storage) if length is None else length

    def __len__(self):
        return self.length

    def __iter__(self):
        for i in range(self.length):
            yield self.storage[self.offset + i]

    def __getitem__(self, index):
        if isinstance(index, slice):
            return [self[i] for i in range(*index.indices(self.length))]
        if index < 0:
            index += self.length
        if not 0 <= index < self.length:
            raise IndexError(index)
        return self.storage[self.offset + index]

    def __setitem__(self, index, value):
        if not isinstance(index, int) or not 0 <= index < self.length:
            raise IndexError(index)
        self.storage[self.offset + index] = value

    def view(self, start, end):
        return TypedArray([], self.width, self.signed, storage=self.storage,
                          offset=self.offset + start, length=max(0, end - start))


@dataclass(eq=False)
class JSClass:
    name: str
    prototype: JSObject
    static: JSObject
    constructor: object = None
    fields: list = field(default_factory=list)
