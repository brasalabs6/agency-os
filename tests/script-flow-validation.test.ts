import { describe, expect, it } from "vitest";
import { applyScriptPatch, validateScriptGraph } from "@/lib/validation/script-flow";
import type { ScriptGraph } from "@/lib/domain/script-flow";

const graph:ScriptGraph={
  schemaVersion:1,startNodeId:"start",
  nodes:[
    {id:"start",type:"MESSAGE",title:"Olá",script:"Posso explicar?"},
    {id:"objection",type:"QUESTION",title:"Objeção",script:"Qual é sua dúvida?"},
    {id:"end",type:"END",title:"Fim",script:"Obrigado."},
  ],
  edges:[
    {id:"a",source:"start",target:"objection",reaction:{label:"Tem uma dúvida"}},
    {id:"b",source:"objection",target:"start",reaction:{label:"Quer ouvir novamente"}},
    {id:"c",source:"objection",target:"end",reaction:{label:"Prefere terminar"}},
  ],
};

describe("Conversation Script Graph rules",()=>{
  it("accepts reachable cycles when an END remains possible",()=>{
    expect(validateScriptGraph(graph,true).edges).toHaveLength(3);
  });
  it("accepts an empty draft but not an empty published graph",()=>{
    const empty={schemaVersion:1,startNodeId:"",nodes:[],edges:[]};
    expect(validateScriptGraph(empty)).toEqual(empty);
    expect(()=>validateScriptGraph(empty,true)).toThrow();
  });
  it("rejects a dangling edge even in draft",()=>{
    const bad={...graph,edges:[...graph.edges,{id:"bad",source:"ghost",target:"end",reaction:{label:"foo"}}]};
    expect(()=>validateScriptGraph(bad)).toThrow();
  });
  it("rejects an unreachable node when publishing",()=>{
    const bad={...graph,nodes:[...graph.nodes,{id:"orphan",type:"END" as const,title:"Outro",script:"Fim"}]};
    expect(()=>validateScriptGraph(bad,true)).toThrow();
  });
  it("rejects an endless cycle",()=>{
    const bad={...graph,edges:graph.edges.filter(e=>e.id!=="c"),nodes:graph.nodes.filter(n=>n.id!=="end")};
    expect(()=>validateScriptGraph(bad,true)).toThrow();
  });
  it("rejects outgoing edges from END",()=>{
    const bad={...graph,edges:[...graph.edges,{id:"d",source:"end",target:"start",reaction:{label:"Retomar"}}]};
    expect(()=>validateScriptGraph(bad,true)).toThrow();
  });
  it("rejects duplicate reactions per source regardless of case",()=>{
    const bad={...graph,edges:[...graph.edges,{id:"d",source:"start",target:"end",reaction:{label:" TEM UMA DÚVIDA "}}]};
    expect(()=>validateScriptGraph(bad)).toThrow();
  });
  it("applies a batch patch without mutating the original graph",()=>{
    const updated=applyScriptPatch(graph,[
      {op:"updateNode",nodeId:"start",changes:{script:"Nova fala"}},
      {op:"addEdge",edge:{id:"d",source:"start",target:"end",reaction:{label:"Não tem tempo"}}}
    ]);
    expect(updated.nodes[0].script).toBe("Nova fala");
    expect(graph.nodes[0].script).toBe("Posso explicar?");
    expect(updated.edges).toHaveLength(4);
  });
  it("requires removeNode to remove dependent edges in same batch",()=>{
    expect(()=>applyScriptPatch(graph,[{op:"removeNode",nodeId:"objection"}])).toThrow();
    expect(()=>applyScriptPatch(graph,[
      {op:"removeEdge",edgeId:"a"},{op:"removeEdge",edgeId:"b"},{op:"removeEdge",edgeId:"c"},
      {op:"removeNode",nodeId:"objection"},{op:"addEdge",edge:{id:"direct",source:"start",target:"end",reaction:{label:"Finalizar"}}}
    ])).not.toThrow();
  });
  it("rejects invalid schema, oversized scripts and duplicate IDs",()=>{
    expect(()=>validateScriptGraph({...graph,schemaVersion:99})).toThrow();
    expect(()=>validateScriptGraph({...graph,nodes:[...graph.nodes,graph.nodes[0]]})).toThrow();
    expect(()=>validateScriptGraph({...graph,nodes:[{...graph.nodes[0],script:"x".repeat(5001)},...graph.nodes.slice(1)]})).toThrow();
  });
});
