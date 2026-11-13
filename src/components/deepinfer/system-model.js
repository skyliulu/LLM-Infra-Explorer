import { SOURCE_BASE } from './model.js';

// Composition defines drill-down; the arrows within each view describe that
// level's relationship. Presentation navigation is separate from trace playback.
export const FRAMEWORK = {
 service:{children:['gateway','engine','cache'],source:'doc/inference_deployment_qa.md#L23'},
 gateway:{parent:'service',source:'doc/inference_deployment_qa.md#L290'},
 engine:{parent:'service',children:['queue','scheduler','execution','results'],source:'deepinfer/engine/llm_engine.py#L860'},
 cache:{parent:'service',source:'doc/inference_deployment_qa.md#L129',related:['radixcache','cachearch']},
 queue:{parent:'engine',source:'deepinfer/entrypoints/llm.py#L168'},
 scheduler:{parent:'engine',source:'csrc/engine/scheduler.hpp#L275'},
 execution:{parent:'engine',children:['attention','experts','sampling'],source:'deepinfer/worker/model_runner.py#L308'},
 results:{parent:'engine',source:'deepinfer/worker/worker.py#L89'},
 attention:{parent:'execution',source:'deepinfer/model_executor/models/v4_modules/attn.py#L752',related:['sparseattn']},
 experts:{parent:'execution',source:'deepinfer/model_executor/models/v4_modules/mlp.py#L565',related:['parallel']},
 sampling:{parent:'execution',source:'deepinfer/worker/worker.py#L89',related:['speculative']},
};
export const RELATED_TOPICS = {
 speculative:'#speculative?section=speculativedecoding-2',
 parallel:'#parallel?section=parallelstrategies-1',
 sparseattn:'#sparseattn?section=sparse-overview',
 radixcache:'#radixcache',cachearch:'#cachearch',
};
export function deriveFrameworkView(level='engine',selection='scheduler') {
 const current=FRAMEWORK[level]?.children?level:'engine';
 const children=FRAMEWORK[current].children;
 const selected=children.includes(selection)?selection:children[0];
 const trail=[];
 for(let id=current;id;id=FRAMEWORK[id].parent)trail.unshift(id);
 return {level:current,children,selected,trail,parent:FRAMEWORK[current].parent||null,
   source:`${SOURCE_BASE}${FRAMEWORK[selected].source}`,
   related:FRAMEWORK[selected].related||[],canEnter:Boolean(FRAMEWORK[selected].children)};
}
