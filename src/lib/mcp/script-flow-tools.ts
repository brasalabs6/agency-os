import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ActorContext } from "@/lib/domain/types";
import { requireScope } from "@/lib/auth/mcp-auth";
import { SCRIPT_CHANNELS, SCRIPT_PURPOSES } from "@/lib/domain/script-flow";
import { scriptGraphSchema, patchScriptSchema } from "@/lib/validation/script-flow";
import { createLeadScript, getLeadScript, listLeadScripts, patchLeadScript, replaceLeadScript } from "@/lib/services/script-flows";
import { mcpReadAnnotations, mcpWriteAnnotations, mcpTextResult } from "./helpers";

export function registerScriptFlowTools(server:McpServer,actor:ActorContext) {
  server.registerTool("lead_scripts_list", {
    title:"List lead conversation scripts",
    description:"List planned conversational graphs for one lead, filtered by channel/purpose. No messages are sent.",
    annotations:mcpReadAnnotations,
    inputSchema:z.object({
      leadId:z.string().uuid(),channel:z.enum(SCRIPT_CHANNELS).optional(),purpose:z.enum(SCRIPT_PURPOSES).optional(),
      limit:z.number().int().min(1).max(100).default(50),offset:z.number().int().min(0).default(0)
    }),
  },async ({leadId,channel,purpose,limit,offset})=>{
    requireScope(actor,"scripts.read");
    return mcpTextResult(await listLeadScripts(leadId,actor,{channel,purpose,limit,offset}));
  });
  server.registerTool("lead_script_get", {
    title:"Get lead conversation script graph",
    description:"Read an immutable published, draft or historical revision; use its expected version for subsequent edits.",
    annotations:mcpReadAnnotations,
    inputSchema:z.object({
      leadId:z.string().uuid(),scriptId:z.string().uuid(),
      view:z.enum(["published","draft"]).optional(),revisionId:z.string().uuid().optional(),
    }),
  },async ({leadId,scriptId,view,revisionId})=>{
    requireScope(actor,"scripts.read");
    return mcpTextResult(await getLeadScript(leadId,scriptId,actor,{view,revisionId}));
  });
  server.registerTool("lead_script_upsert",{
    title:"Create or replace draft script graph",
    description:"mode=create requires creationKey, title, channel, purpose and graph. mode=replace requires scriptId and expectedVersion; published versions are never changed.",
    annotations:mcpWriteAnnotations,
    inputSchema:z.discriminatedUnion("mode",[
      z.strictObject({
        mode:z.literal("create"),leadId:z.string().uuid(),
        creationKey:z.string().trim().min(1).max(180),
        title:z.string().trim().min(1).max(180),
        channel:z.enum(SCRIPT_CHANNELS),purpose:z.enum(SCRIPT_PURPOSES),
        graph:scriptGraphSchema,
      }),
      z.strictObject({
        mode:z.literal("replace"),leadId:z.string().uuid(),scriptId:z.string().uuid(),
        expectedVersion:z.number().int().positive(),graph:scriptGraphSchema,
        summary:z.string().max(500).optional(),
      }),
    ]),
  },async args=>{
    requireScope(actor,"scripts.write");
    if(args.mode==="create")return mcpTextResult(await createLeadScript(args.leadId,{
      creationKey:args.creationKey,title:args.title,channel:args.channel,purpose:args.purpose,graph:args.graph,
    },actor,"lead_script_upsert"));
    return mcpTextResult(await replaceLeadScript(args.leadId,args.scriptId,{
      expectedVersion:args.expectedVersion,graph:args.graph,summary:args.summary
    },actor,"lead_script_upsert"));
  });
  server.registerTool("lead_script_patch",{
    title:"Patch script graph",
    description:"Atomically add/update/remove nodes or reactions of draft using expectedVersion. Published snapshot remains unchanged.",
    annotations:mcpWriteAnnotations,
    inputSchema:patchScriptSchema.extend({leadId:z.string().uuid(),scriptId:z.string().uuid()}),
  },async ({leadId,scriptId,...input})=>{
    requireScope(actor,"scripts.write");
    return mcpTextResult(await patchLeadScript(leadId,scriptId,input,actor,"lead_script_patch"));
  });
}
