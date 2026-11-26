import{j as e}from"./iframe-BJectA6S.js";import{I as n,L}from"./label-zZ2ndAxA.js";import{S as E}from"./search-DAuAiHnX.js";import"./preload-helper-C1FmrZbK.js";import"./createLucideIcon-C3vR_ETf.js";const R={title:"UI/Input",component:n,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{disabled:{control:"boolean",description:"Whether input is disabled"},placeholder:{control:"text",description:"Placeholder string"},type:{control:"select",options:["text","password","email","number","tel"],description:"HTML input type"}}},a={args:{placeholder:"Enter text…",className:"w-72"}},s={args:{placeholder:"Disabled field",disabled:!0,value:"Readonly value",className:"w-72"}},r={args:{type:"password",placeholder:"••••••••",className:"w-72"}},t={render:()=>e.jsxs("div",{className:"w-72 space-y-1.5",children:[e.jsx(L,{htmlFor:"email",children:"Email Address"}),e.jsx(n,{id:"email",type:"email",placeholder:"admin@realestatecrm.com"}),e.jsx("p",{className:"text-xs text-slate-500",children:"We will send verification credentials here."})]})},l={render:()=>e.jsxs("div",{className:"relative w-80",children:[e.jsx(E,{className:"w-4 h-4 absolute left-3 top-2.5 text-slate-400"}),e.jsx(n,{className:"pl-9",placeholder:"Search admins by name or username…"})]})},o={render:()=>e.jsxs("div",{className:"w-72 space-y-1.5",children:[e.jsx(L,{htmlFor:"err-input",className:"text-rose-600",children:"Username"}),e.jsx(n,{id:"err-input",defaultValue:"user#invalid",className:"border-rose-400 focus-visible:ring-rose-500"}),e.jsx("p",{className:"text-xs text-rose-500",children:"Username can only contain lowercase letters, numbers, and hyphens."})]})},A=["Default","Disabled","Password","WithLabel","WithSearchIcon","ErrorState"];var c,d,i;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text…',
    className: 'w-72'
  }
}`,...(i=(d=a.parameters)==null?void 0:d.docs)==null?void 0:i.source}}};var m,p,u;s.parameters={...s.parameters,docs:{...(m=s.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    placeholder: 'Disabled field',
    disabled: true,
    value: 'Readonly value',
    className: 'w-72'
  }
}`,...(u=(p=s.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var h,x,b;r.parameters={...r.parameters,docs:{...(h=r.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    type: 'password',
    placeholder: '••••••••',
    className: 'w-72'
  }
}`,...(b=(x=r.parameters)==null?void 0:x.docs)==null?void 0:b.source}}};var N,w,v;t.parameters={...t.parameters,docs:{...(N=t.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <div className="w-72 space-y-1.5">
      <Label htmlFor="email">Email Address</Label>
      <Input id="email" type="email" placeholder="admin@realestatecrm.com" />
      <p className="text-xs text-slate-500">We will send verification credentials here.</p>
    </div>
}`,...(v=(w=t.parameters)==null?void 0:w.docs)==null?void 0:v.source}}};var y,g,f;l.parameters={...l.parameters,docs:{...(y=l.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <div className="relative w-80">
      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
      <Input className="pl-9" placeholder="Search admins by name or username…" />
    </div>
}`,...(f=(g=l.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var S,j,I;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div className="w-72 space-y-1.5">
      <Label htmlFor="err-input" className="text-rose-600">Username</Label>
      <Input id="err-input" defaultValue="user#invalid" className="border-rose-400 focus-visible:ring-rose-500" />
      <p className="text-xs text-rose-500">Username can only contain lowercase letters, numbers, and hyphens.</p>
    </div>
}`,...(I=(j=o.parameters)==null?void 0:j.docs)==null?void 0:I.source}}};export{a as Default,s as Disabled,o as ErrorState,r as Password,t as WithLabel,l as WithSearchIcon,A as __namedExportsOrder,R as default};
