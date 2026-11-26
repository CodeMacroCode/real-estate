import{r,j as e}from"./iframe-BJectA6S.js";import{X as N}from"./x-DQAwYaHK.js";import{B as n}from"./button-IdEZ5Pk1.js";import{L as c,I as m}from"./label-zZ2ndAxA.js";import"./preload-helper-C1FmrZbK.js";import"./createLucideIcon-C3vR_ETf.js";function i({isOpen:a,onClose:t,title:y,description:o,children:j,maxWidth:g="md"}){if(r.useEffect(()=>{const d=w=>{w.key==="Escape"&&a&&t()};return window.addEventListener("keydown",d),()=>window.removeEventListener("keydown",d)},[a,t]),!a)return null;const b={sm:"max-w-sm",md:"max-w-md",lg:"max-w-lg",xl:"max-w-xl","2xl":"max-w-2xl","4xl":"max-w-4xl"};return e.jsx("div",{className:"fixed inset-0 z-50 overflow-y-auto",children:e.jsxs("div",{className:"flex min-h-screen items-center justify-center p-4 text-center sm:p-0",children:[e.jsx("div",{className:"fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity",onClick:t}),e.jsxs("div",{className:`relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all w-full my-8 ${b[g]} z-10`,children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-slate-100 px-6 py-4",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-semibold text-slate-900",children:y}),o&&e.jsx("p",{className:"text-sm text-slate-500 mt-0.5",children:o})]}),e.jsx("button",{onClick:t,className:"rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition","aria-label":"Close dialog",children:e.jsx(N,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto",children:j})]})]})})}i.__docgenInfo={description:"",methods:[],displayName:"Modal",props:{isOpen:{required:!0,tsType:{name:"boolean"},description:""},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},title:{required:!0,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"string"},description:""},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},maxWidth:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'xl'"},{name:"literal",value:"'2xl'"},{name:"literal",value:"'4xl'"}]},description:"",defaultValue:{value:"'md'",computed:!1}}}};const E={title:"UI/Modal",component:i,parameters:{layout:"centered"},tags:["autodocs"]},s={render:()=>{const[a,t]=r.useState(!0);return e.jsxs("div",{children:[e.jsx(n,{onClick:()=>t(!0),children:"Open Modal"}),e.jsx(i,{isOpen:a,onClose:()=>t(!1),title:"Create New Administrator",description:"Provision a new admin account with delegated company roles.",maxWidth:"md",children:e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(c,{htmlFor:"m-name",children:"Full Name"}),e.jsx(m,{id:"m-name",placeholder:"e.g. Ramesh Patel"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx(c,{htmlFor:"m-email",children:"Work Email"}),e.jsx(m,{id:"m-email",type:"email",placeholder:"ramesh@realestatecrm.com"})]}),e.jsxs("div",{className:"flex justify-end gap-2 pt-3 border-t border-slate-100",children:[e.jsx(n,{variant:"outline",onClick:()=>t(!1),children:"Cancel"}),e.jsx(n,{onClick:()=>t(!1),children:"Create Admin"})]})]})})]})}},l={render:()=>{const[a,t]=r.useState(!0);return e.jsxs("div",{children:[e.jsx(n,{variant:"outline",onClick:()=>t(!0),children:"Deactivate Account"}),e.jsx(i,{isOpen:a,onClose:()=>t(!1),title:"Deactivate Staff Account",description:"Confirm immediate session revocation.",maxWidth:"sm",children:e.jsxs("div",{className:"space-y-4",children:[e.jsx("p",{className:"text-sm text-slate-600",children:"Are you sure you want to deactivate Rahul Verma? They will be immediately blocked from logging in."}),e.jsxs("div",{className:"flex justify-end gap-2 pt-3 border-t border-slate-100",children:[e.jsx(n,{variant:"outline",onClick:()=>t(!1),children:"Cancel"}),e.jsx(n,{className:"bg-rose-600 hover:bg-rose-700",onClick:()=>t(!1),children:"Deactivate"})]})]})})]})}},M=["Default","ConfirmationDialog"];var u,p,x;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => {
    const [open, setOpen] = useState(true);
    return <div>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Create New Administrator" description="Provision a new admin account with delegated company roles." maxWidth="md">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Full Name</Label>
              <Input id="m-name" placeholder="e.g. Ramesh Patel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Work Email</Label>
              <Input id="m-email" type="email" placeholder="ramesh@realestatecrm.com" />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Create Admin</Button>
            </div>
          </div>
        </Modal>
      </div>;
  }
}`,...(x=(p=s.parameters)==null?void 0:p.docs)==null?void 0:x.source}}};var v,h,f;l.parameters={...l.parameters,docs:{...(v=l.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => {
    const [open, setOpen] = useState(true);
    return <div>
        <Button variant="outline" onClick={() => setOpen(true)}>Deactivate Account</Button>
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Deactivate Staff Account" description="Confirm immediate session revocation." maxWidth="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to deactivate Rahul Verma? They will be immediately blocked from logging in.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => setOpen(false)}>Deactivate</Button>
            </div>
          </div>
        </Modal>
      </div>;
  }
}`,...(f=(h=l.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};export{l as ConfirmationDialog,s as Default,M as __namedExportsOrder,E as default};
