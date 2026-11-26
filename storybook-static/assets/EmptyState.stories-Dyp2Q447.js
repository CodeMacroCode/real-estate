import{j as e}from"./iframe-BJectA6S.js";import{c as g}from"./createLucideIcon-C3vR_ETf.js";import{U as w}from"./users-BxivNprY.js";import"./preload-helper-C1FmrZbK.js";/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y={name:"file-question-mark",size:24,node:[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M12 17h.01",key:"p32p05"}],["path",{d:"M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3",key:"mhlwft"}]],aliases:["file-question"]};y.node;const S=g(y);/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b={name:"inbox",size:24,node:[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]};b.node;const j=g(b);function x({icon:h,title:N,description:A,actionLabel:s,onAction:o}){return e.jsxs("div",{className:"flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-200",children:[e.jsx("div",{className:"w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3",children:h||e.jsx(j,{className:"w-6 h-6"})}),e.jsx("h3",{className:"text-base font-semibold text-slate-900",children:N}),e.jsx("p",{className:"mt-1 text-sm text-slate-500 max-w-sm",children:A}),s&&o&&e.jsx("button",{onClick:o,className:"mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition",children:s})]})}x.__docgenInfo={description:"",methods:[],displayName:"EmptyState",props:{icon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},title:{required:!0,tsType:{name:"string"},description:""},description:{required:!0,tsType:{name:"string"},description:""},actionLabel:{required:!1,tsType:{name:"string"},description:""},onAction:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const I={title:"UI/EmptyState",component:x,parameters:{layout:"centered"},tags:["autodocs"]},t={args:{title:"No Records Found",description:"There are currently no items matching your filter criteria.",actionLabel:"Add Record",onAction:()=>alert("Action triggered!")}},r={args:{icon:e.jsx(w,{className:"w-6 h-6 text-blue-500"}),title:"No Staff Members Registered",description:"Get started by creating your first team member or operational admin.",actionLabel:"Add Staff Member",onAction:()=>alert("Add Staff Member clicked")}},a={args:{icon:e.jsx(S,{className:"w-6 h-6 text-slate-400"}),title:"No Audit Logs Recorded",description:"Security audit events will be automatically tracked here as users perform actions."}},_=["Default","CustomIcon","InformationOnly"];var n,i,c;t.parameters={...t.parameters,docs:{...(n=t.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    title: 'No Records Found',
    description: 'There are currently no items matching your filter criteria.',
    actionLabel: 'Add Record',
    onAction: () => alert('Action triggered!')
  }
}`,...(c=(i=t.parameters)==null?void 0:i.docs)==null?void 0:c.source}}};var d,l,m;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    icon: <Users className="w-6 h-6 text-blue-500" />,
    title: 'No Staff Members Registered',
    description: 'Get started by creating your first team member or operational admin.',
    actionLabel: 'Add Staff Member',
    onAction: () => alert('Add Staff Member clicked')
  }
}`,...(m=(l=r.parameters)==null?void 0:l.docs)==null?void 0:m.source}}};var u,p,f;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    icon: <FileQuestion className="w-6 h-6 text-slate-400" />,
    title: 'No Audit Logs Recorded',
    description: 'Security audit events will be automatically tracked here as users perform actions.'
  }
}`,...(f=(p=a.parameters)==null?void 0:p.docs)==null?void 0:f.source}}};export{r as CustomIcon,t as Default,a as InformationOnly,_ as __namedExportsOrder,I as default};
