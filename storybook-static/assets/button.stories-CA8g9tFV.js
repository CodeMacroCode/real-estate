import{j as e}from"./iframe-BJectA6S.js";import{B as l}from"./button-IdEZ5Pk1.js";import{c as m}from"./createLucideIcon-C3vR_ETf.js";import"./preload-helper-C1FmrZbK.js";/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R={name:"arrow-right",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]};R.node;const $=m(R);/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T={name:"download",size:24,node:[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]};T.node;const C=m(T);/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U={name:"plus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]};U.node;const H=m(U);/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W={name:"trash",size:24,node:[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],aliases:["trash-2"]};W.node;const q=m(W),X={title:"UI/Button",component:l,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","outline","ghost","link"],description:"Visual style variant of the button"},size:{control:"select",options:["default","sm","lg","icon"],description:"Physical size and padding preset"},disabled:{control:"boolean",description:"Whether the button is non-interactive"}}},a={args:{children:"Primary Action",variant:"default",size:"default"}},r={args:{children:"Secondary Action",variant:"outline",size:"default"}},s={args:{children:"Ghost Action",variant:"ghost",size:"default"}},t={args:{children:"View details",variant:"link"}},n={args:{children:"Small Button",size:"sm"}},o={args:{children:"Large Action",size:"lg"}},i={args:{children:"Disabled State",disabled:!0}},c={render:()=>e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs(l,{variant:"default",children:[e.jsx(H,{className:"w-4 h-4 mr-2"}),"Add User"]}),e.jsxs(l,{variant:"outline",children:[e.jsx(C,{className:"w-4 h-4 mr-2"}),"Export CSV"]}),e.jsxs(l,{variant:"ghost",children:["Next Step",e.jsx($,{className:"w-4 h-4 ml-2"})]})]})},d={args:{size:"icon",variant:"outline",children:e.jsx(q,{className:"w-4 h-4 text-rose-500"}),"aria-label":"Delete record"}},Y=["Default","Outline","Ghost","Link","Small","Large","Disabled","WithIcon","IconButton"];var u,p,h;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    children: 'Primary Action',
    variant: 'default',
    size: 'default'
  }
}`,...(h=(p=a.parameters)==null?void 0:p.docs)==null?void 0:h.source}}};var g,v,y;r.parameters={...r.parameters,docs:{...(g=r.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    children: 'Secondary Action',
    variant: 'outline',
    size: 'default'
  }
}`,...(y=(v=r.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var x,f,S;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
    size: 'default'
  }
}`,...(S=(f=s.parameters)==null?void 0:f.docs)==null?void 0:S.source}}};var z,k,w;t.parameters={...t.parameters,docs:{...(z=t.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    children: 'View details',
    variant: 'link'
  }
}`,...(w=(k=t.parameters)==null?void 0:k.docs)==null?void 0:w.source}}};var D,b,B;n.parameters={...n.parameters,docs:{...(D=n.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    children: 'Small Button',
    size: 'sm'
  }
}`,...(B=(b=n.parameters)==null?void 0:b.docs)==null?void 0:B.source}}};var j,A,N;o.parameters={...o.parameters,docs:{...(j=o.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    children: 'Large Action',
    size: 'lg'
  }
}`,...(N=(A=o.parameters)==null?void 0:A.docs)==null?void 0:N.source}}};var M,_,V;i.parameters={...i.parameters,docs:{...(M=i.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    children: 'Disabled State',
    disabled: true
  }
}`,...(V=(_=i.parameters)==null?void 0:_.docs)==null?void 0:V.source}}};var L,I,P;c.parameters={...c.parameters,docs:{...(L=c.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-3">
      <Button variant="default">
        <Plus className="w-4 h-4 mr-2" />
        Add User
      </Button>
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="ghost">
        Next Step
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
}`,...(P=(I=c.parameters)==null?void 0:I.docs)==null?void 0:P.source}}};var E,G,O;d.parameters={...d.parameters,docs:{...(E=d.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    size: 'icon',
    variant: 'outline',
    children: <Trash2 className="w-4 h-4 text-rose-500" />,
    'aria-label': 'Delete record'
  }
}`,...(O=(G=d.parameters)==null?void 0:G.docs)==null?void 0:O.source}}};export{a as Default,i as Disabled,s as Ghost,d as IconButton,o as Large,t as Link,r as Outline,n as Small,c as WithIcon,Y as __namedExportsOrder,X as default};
