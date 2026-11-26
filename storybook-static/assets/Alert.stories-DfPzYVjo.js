import{j as e}from"./iframe-BJectA6S.js";import{X as T}from"./x-DQAwYaHK.js";import{c as j}from"./createLucideIcon-C3vR_ETf.js";import{C as _,a as D}from"./circle-check-BtHp91S3.js";import"./preload-helper-C1FmrZbK.js";/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C={name:"info",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]};C.node;const q=j(C);/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S={name:"triangle-alert",size:24,node:[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],aliases:["alert-triangle"]};S.node;const U=j(S);function M({type:N="info",title:o,message:I,onClose:i}){const c={error:{wrapper:"bg-rose-50 border-rose-200 text-rose-800",icon:e.jsx(D,{className:"w-5 h-5 text-rose-500 shrink-0"})},success:{wrapper:"bg-emerald-50 border-emerald-200 text-emerald-800",icon:e.jsx(_,{className:"w-5 h-5 text-emerald-500 shrink-0"})},warning:{wrapper:"bg-amber-50 border-amber-200 text-amber-800",icon:e.jsx(U,{className:"w-5 h-5 text-amber-500 shrink-0"})},info:{wrapper:"bg-blue-50 border-blue-200 text-blue-800",icon:e.jsx(q,{className:"w-5 h-5 text-blue-500 shrink-0"})}}[N];return e.jsxs("div",{className:`p-4 rounded-lg border flex items-start gap-3 ${c.wrapper}`,children:[c.icon,e.jsxs("div",{className:"flex-1 text-sm",children:[o&&e.jsx("h4",{className:"font-semibold mb-1",children:o}),e.jsx("p",{children:I})]}),i&&e.jsx("button",{onClick:i,className:"text-slate-400 hover:text-slate-600 transition p-1","aria-label":"Dismiss alert",children:e.jsx(T,{className:"w-4 h-4"})})]})}M.__docgenInfo={description:"",methods:[],displayName:"Alert",props:{type:{required:!1,tsType:{name:"union",raw:"'error' | 'success' | 'warning' | 'info'",elements:[{name:"literal",value:"'error'"},{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'info'"}]},description:"",defaultValue:{value:"'info'",computed:!1}},title:{required:!1,tsType:{name:"string"},description:""},message:{required:!0,tsType:{name:"string"},description:""},onClose:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const O={title:"UI/Alert",component:M,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{type:{control:"select",options:["info","success","warning","error"],description:"Alert semantic status"},title:{control:"text",description:"Bold title text"},message:{control:"text",description:"Body message text"}}},s={args:{type:"info",title:"System Information",message:"Maintenance window is scheduled for Sunday at 02:00 AM UTC."}},a={args:{type:"success",title:"Account Provisioned",message:"Administrator Rahul Verma has been successfully created.",onClose:()=>alert("Dismissed!")}},r={args:{type:"warning",title:"Permission Boundary Warning",message:"Admins cannot assign permissions exceeding their own company-wide scope."}},t={args:{type:"error",title:"Validation Failed",message:'Username "admin" is already taken by another staff member.',onClose:()=>alert("Dismissed!")}},n={args:{type:"info",message:"Changes are automatically saved as draft."}},R=["Info","Success","Warning","ErrorState","MessageOnly"];var l,m,d;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    type: 'info',
    title: 'System Information',
    message: 'Maintenance window is scheduled for Sunday at 02:00 AM UTC.'
  }
}`,...(d=(m=s.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};var p,u,g;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    type: 'success',
    title: 'Account Provisioned',
    message: 'Administrator Rahul Verma has been successfully created.',
    onClose: () => alert('Dismissed!')
  }
}`,...(g=(u=a.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var y,f,h;r.parameters={...r.parameters,docs:{...(y=r.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    type: 'warning',
    title: 'Permission Boundary Warning',
    message: 'Admins cannot assign permissions exceeding their own company-wide scope.'
  }
}`,...(h=(f=r.parameters)==null?void 0:f.docs)==null?void 0:h.source}}};var x,b,w;t.parameters={...t.parameters,docs:{...(x=t.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    type: 'error',
    title: 'Validation Failed',
    message: 'Username "admin" is already taken by another staff member.',
    onClose: () => alert('Dismissed!')
  }
}`,...(w=(b=t.parameters)==null?void 0:b.docs)==null?void 0:w.source}}};var v,A,k;n.parameters={...n.parameters,docs:{...(v=n.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    type: 'info',
    message: 'Changes are automatically saved as draft.'
  }
}`,...(k=(A=n.parameters)==null?void 0:A.docs)==null?void 0:k.source}}};export{t as ErrorState,s as Info,n as MessageOnly,a as Success,r as Warning,R as __namedExportsOrder,O as default};
