import{j as e}from"./iframe-BJectA6S.js";import{B as d}from"./button-IdEZ5Pk1.js";import{U as j}from"./users-BxivNprY.js";import{c as v}from"./createLucideIcon-C3vR_ETf.js";import"./preload-helper-C1FmrZbK.js";/**
 * @license lucide-react v1.66.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x={name:"trending-up",size:24,node:[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]]};x.node;const b=v(x);function l({className:s="",children:a,...t}){return e.jsx("div",{className:`rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm ${s}`,...t,children:a})}function f({className:s="",children:a,...t}){return e.jsx("div",{className:`flex flex-col space-y-1.5 p-6 ${s}`,...t,children:a})}function h({className:s="",children:a,...t}){return e.jsx("h3",{className:`text-lg font-semibold leading-none tracking-tight text-slate-900 ${s}`,...t,children:a})}function N({className:s="",children:a,...t}){return e.jsx("p",{className:`text-sm text-slate-500 ${s}`,...t,children:a})}function g({className:s="",children:a,...t}){return e.jsx("div",{className:`p-6 pt-0 ${s}`,...t,children:a})}function C({className:s="",children:a,...t}){return e.jsx("div",{className:`flex items-center p-6 pt-0 ${s}`,...t,children:a})}l.__docgenInfo={description:"",methods:[],displayName:"Card",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};f.__docgenInfo={description:"",methods:[],displayName:"CardHeader",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};h.__docgenInfo={description:"",methods:[],displayName:"CardTitle",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};N.__docgenInfo={description:"",methods:[],displayName:"CardDescription",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};g.__docgenInfo={description:"",methods:[],displayName:"CardContent",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};C.__docgenInfo={description:"",methods:[],displayName:"CardFooter",props:{className:{defaultValue:{value:'""',computed:!1},required:!1}}};const D={title:"UI/Card",component:l,parameters:{layout:"centered"},tags:["autodocs"]},r={render:()=>e.jsxs(l,{className:"w-96",children:[e.jsxs(f,{children:[e.jsx(h,{children:"System Role Profile"}),e.jsx(N,{children:"Configure authority and least-privilege lead scope."})]}),e.jsx(g,{children:e.jsx("p",{className:"text-sm text-slate-600",children:"Super Administrators hold global governance rights and company-wide lead visibility across all branches."})}),e.jsxs(C,{className:"flex justify-end gap-2",children:[e.jsx(d,{variant:"outline",size:"sm",children:"Cancel"}),e.jsx(d,{size:"sm",children:"Save Role"})]})]})},n={render:()=>e.jsxs(l,{className:"w-80 p-5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-slate-500",children:"Active Staff"}),e.jsx("div",{className:"flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600",children:e.jsx(j,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"mt-3 flex items-baseline gap-2",children:[e.jsx("span",{className:"text-2xl font-bold text-slate-900",children:"42"}),e.jsxs("span",{className:"flex items-center text-xs font-semibold text-emerald-600",children:[e.jsx(b,{className:"w-3 h-3 mr-0.5"}),"+12%"]})]}),e.jsx("p",{className:"mt-1 text-xs text-slate-400",children:"Across 4 regional branches"})]})},q=["Default","MetricCard"];var o,i,c;r.parameters={...r.parameters,docs:{...(o=r.parameters)==null?void 0:o.docs,source:{originalSource:`{
  render: () => <Card className="w-96">
      <CardHeader>
        <CardTitle>System Role Profile</CardTitle>
        <CardDescription>Configure authority and least-privilege lead scope.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Super Administrators hold global governance rights and company-wide lead visibility across all branches.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save Role</Button>
      </CardFooter>
    </Card>
}`,...(c=(i=r.parameters)==null?void 0:i.docs)==null?void 0:c.source}}};var m,p,u;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <Card className="w-80 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">Active Staff</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Users className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">42</span>
        <span className="flex items-center text-xs font-semibold text-emerald-600">
          <TrendingUp className="w-3 h-3 mr-0.5" />
          +12%
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">Across 4 regional branches</p>
    </Card>
}`,...(u=(p=n.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};export{r as Default,n as MetricCard,q as __namedExportsOrder,D as default};
