import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { i as prefixedDigestSchema, n as init_digests } from "./digests-D7B1dpH1.js";
import { d as init_browserDeadline, g as webRuntimeCommandTimeoutSchema } from "./browserDeadline-YXJtM4nx.js";
import { l as init_browserObservation, o as browserEndpointSchema } from "./webContentArtifact-DizkmFFA.js";
import { a as cdpDomNodeSchema, c as init_cdpObservationSchemas, d as init_browserCompleteness, l as browserCompletenessSchema, n as browserVersionSchema, o as cdpScriptMetadataSchema, r as init_browserObservationSchemas, s as cdpScriptSourceSchema } from "./browserObservationSchemas-D39m0z_p.js";
import { z } from "zod";

//#region dist/domain/javascript/electronObservation.js
var approvedElectronInput, listElectronTargetsInputSchema, inspectElectronPageFacts, inspectElectronPageInputSchema, electronTargetSchema, electronTargetListSchema, electronPageInspectionSchema;
function init_electronObservation() {
	return (init_electronObservation = __esmMin((() => {
		init_browserDeadline();
		init_browserCompleteness();
		init_browserObservation();
		init_browserObservationSchemas();
		init_cdpObservationSchemas();
		init_digests();
		approvedElectronInput = { cdp_endpoint: browserEndpointSchema };
		listElectronTargetsInputSchema = z.strictObject({ ...approvedElectronInput });
		inspectElectronPageFacts = {
			...approvedElectronInput,
			target_id: z.string().trim().min(1),
			observation_ms: z.number().int().min(0).default(100),
			command_timeout_ms: webRuntimeCommandTimeoutSchema
		};
		inspectElectronPageInputSchema = z.union([z.strictObject({
			...inspectElectronPageFacts,
			include_script_sources: z.literal(false).default(false)
		}), z.strictObject({
			...inspectElectronPageFacts,
			include_script_sources: z.literal(true)
		})]);
		electronTargetSchema = z.object({
			target_id: z.string(),
			type: z.string(),
			title: z.string(),
			file_path: z.string(),
			attached: z.boolean().nullable().describe("Discovery-reported debugger attachment state; null means unknown")
		});
		electronTargetListSchema = z.object({
			browser: browserVersionSchema,
			targets: z.array(electronTargetSchema),
			excluded: z.object({
				unsupported_url: z.number().int().min(0),
				non_page: z.number().int().min(0)
			}),
			limitations: z.array(z.string())
		});
		electronPageInspectionSchema = z.object({
			browser: browserVersionSchema,
			target: electronTargetSchema,
			capture_window: z.object({
				started_at: z.iso.datetime(),
				ended_at: z.iso.datetime(),
				observation_ms: z.number().int().min(0)
			}),
			completeness: browserCompletenessSchema,
			frames: z.array(z.object({
				frame_id: z.string(),
				parent_frame_id: z.string().nullable(),
				file_path: z.string()
			})),
			dom: z.object({
				total_nodes: z.number().int().min(0),
				nodes: z.array(cdpDomNodeSchema)
			}),
			scripts: z.object({
				total: z.number().int().min(0),
				items: z.array(z.object({
					script_key: prefixedDigestSchema("electron_script"),
					frame_id: z.string().nullable().default(null),
					file_path: z.string(),
					...cdpScriptMetadataSchema.shape,
					source: cdpScriptSourceSchema
				}))
			}),
			resources: z.array(z.object({
				resource_key: prefixedDigestSchema("electron_resource"),
				file_path: z.string(),
				type: z.string(),
				mime_type: z.string(),
				content_size: z.number().min(0).nullable()
			})),
			workers: z.array(z.object({
				target_id: z.string().min(1),
				type: z.string().min(1),
				file_path: z.string(),
				attached: z.boolean(),
				opener_target_id: z.string().min(1).nullable(),
				parent_frame_id: z.string().min(1).nullable()
			})).default([]),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
export { listElectronTargetsInputSchema as a, inspectElectronPageInputSchema as i, electronTargetListSchema as n, init_electronObservation as r, electronPageInspectionSchema as t };