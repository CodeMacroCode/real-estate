import{j as e}from"./iframe-BJectA6S.js";import{B as a,S as d,R as r,L as i}from"./Badge-D_mh44jL.js";import"./preload-helper-C1FmrZbK.js";const y={title:"UI/Badge",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","success","danger","warning","info","purple","outline","destructive"]},size:{control:"select",options:["sm","md"]}}},s={args:{children:"Badge Label",variant:"default"}},n={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-2 items-center",children:[e.jsx(a,{variant:"default",children:"Default"}),e.jsx(a,{variant:"info",children:"Info"}),e.jsx(a,{variant:"success",children:"Success"}),e.jsx(a,{variant:"warning",children:"Warning"}),e.jsx(a,{variant:"danger",children:"Danger"}),e.jsx(a,{variant:"purple",children:"Purple"}),e.jsx(a,{variant:"outline",children:"Outline"})]})},t={render:()=>e.jsxs("div",{className:"flex gap-4 items-center",children:[e.jsx(d,{status:"active"}),e.jsx(d,{status:"inactive"})]})},l={render:()=>e.jsxs("div",{className:"flex gap-6 items-center",children:[e.jsx(i,{status:"online"}),e.jsx(i,{status:"offline"}),e.jsx(i,{status:"never_logged_in"})]})},o={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-2 items-center",children:[e.jsx(r,{roleSlug:"super_admin",roleName:"Super Admin"}),e.jsx(r,{roleSlug:"admin",roleName:"Admin"}),e.jsx(r,{roleSlug:"sales_executive",roleName:"Sales Executive"}),e.jsx(r,{roleSlug:"sales_manager",roleName:"Sales Manager"}),e.jsx(r,{roleSlug:"property_manager",roleName:"Property Manager"})]})},D=["Default","AllVariants","AccountStatus","UserLoginStatus","RoleBadges"];var c,g,u;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    children: 'Badge Label',
    variant: 'default'
  }
}`,...(u=(g=s.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};var m,p,x;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="default">Default</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="purple">Purple</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
}`,...(x=(p=n.parameters)==null?void 0:p.docs)==null?void 0:x.source}}};var v,S,B;t.parameters={...t.parameters,docs:{...(v=t.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => <div className="flex gap-4 items-center">
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
    </div>
}`,...(B=(S=t.parameters)==null?void 0:S.docs)==null?void 0:B.source}}};var f,j,N;l.parameters={...l.parameters,docs:{...(f=l.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <div className="flex gap-6 items-center">
      <LoginStatusBadge status="online" />
      <LoginStatusBadge status="offline" />
      <LoginStatusBadge status="never_logged_in" />
    </div>
}`,...(N=(j=l.parameters)==null?void 0:j.docs)==null?void 0:N.source}}};var _,h,R;o.parameters={...o.parameters,docs:{...(_=o.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2 items-center">
      <RoleBadge roleSlug="super_admin" roleName="Super Admin" />
      <RoleBadge roleSlug="admin" roleName="Admin" />
      <RoleBadge roleSlug="sales_executive" roleName="Sales Executive" />
      <RoleBadge roleSlug="sales_manager" roleName="Sales Manager" />
      <RoleBadge roleSlug="property_manager" roleName="Property Manager" />
    </div>
}`,...(R=(h=o.parameters)==null?void 0:h.docs)==null?void 0:R.source}}};export{t as AccountStatus,n as AllVariants,s as Default,o as RoleBadges,l as UserLoginStatus,D as __namedExportsOrder,y as default};
