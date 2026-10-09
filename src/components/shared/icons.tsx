import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20" {...props}>
      {children}
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return <IconBase {...props}><path d="m15 18-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconBase>;
}

export function GridIcon(props: IconProps) {
  return <IconBase {...props}><rect height="6" rx="1" stroke="currentColor" strokeWidth="1.6" width="6" x="3" y="3" /><rect height="6" rx="1" stroke="currentColor" strokeWidth="1.6" width="6" x="15" y="3" /><rect height="6" rx="1" stroke="currentColor" strokeWidth="1.6" width="6" x="3" y="15" /><rect height="6" rx="1" stroke="currentColor" strokeWidth="1.6" width="6" x="15" y="15" /></IconBase>;
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></IconBase>;
}

export function LockIcon(props: IconProps) {
  return <IconBase {...props}><rect height="10" rx="2" stroke="currentColor" strokeWidth="1.6" width="14" x="5" y="10" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.6" /></IconBase>;
}

export function ImageIcon(props: IconProps) {
  return <IconBase {...props}><rect height="16" rx="2" stroke="currentColor" strokeWidth="1.6" width="18" x="3" y="4" /><circle cx="8.5" cy="9" fill="currentColor" r="1.5" /><path d="m5 18 5-5 3.2 3.2 2.3-2.3L20 18" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconBase>;
}

const stroke = { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.7" } as const;

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 11 8-7 8 7v8.5a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1V11Z" {...stroke} /></IconBase>;
}

export function DoorIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 20V5.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V20" {...stroke} />
      <path d="M4 20h16" {...stroke} />
      <circle cx="14.2" cy="12.4" fill="currentColor" r="0.9" />
    </IconBase>
  );
}

export function FolderIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" {...stroke} /></IconBase>;
}

export function UsersIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="9" cy="8.5" r="3.2" {...stroke} /><path d="M3.5 19c.4-3 2.6-4.8 5.5-4.8s5.1 1.8 5.5 4.8M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.5c1.7.5 2.8 2 3 4.5" {...stroke} /></IconBase>;
}

export function PinIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" {...stroke} /><circle cx="12" cy="10" r="2.3" {...stroke} /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="6.5" {...stroke} /><path d="m16 16 4 4" {...stroke} /></IconBase>;
}

export function CameraIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 8.5a2 2 0 0 1 2-2h2l1.3-1.8h5.4L16 6.5h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5Z" {...stroke} /><circle cx="12" cy="12.5" r="3.3" {...stroke} /></IconBase>;
}

export function MailIcon(props: IconProps) {
  return <IconBase {...props}><rect height="14" rx="2" width="18" x="3" y="5" {...stroke} /><path d="m4 7 8 6 8-6" {...stroke} /></IconBase>;
}

export function EyeIcon(props: IconProps) {
  return <IconBase {...props}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...stroke} /><circle cx="12" cy="12" r="2.8" {...stroke} /></IconBase>;
}

export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect height="15" rx="2" width="17" x="3.5" y="5.5" {...stroke} /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" {...stroke} /></IconBase>;
}

export function ArrowRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 6 6 6-6 6" {...stroke} /></IconBase>;
}

export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="M6 6l12 12M18 6 6 18" {...stroke} /></IconBase>;
}

export function EditIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" {...stroke} /></IconBase>;
}

export function LeafIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 19c0-8 4-13 14-14 0 9-4 13-12 13M5 19c2-4 5-7 9-9" {...stroke} /></IconBase>;
}

export function BookIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" /></IconBase>;
}

export function UserIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="3.6" {...stroke} /><path d="M4.5 20c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6" {...stroke} /></IconBase>;
}

export function TextIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 7h14M5 12h14M5 17h9" {...stroke} /></IconBase>;
}

export function SmileIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M8.5 14c.9 1.3 2 2 3.5 2s2.6-.7 3.5-2M9 9.8h.01M15 9.8h.01" {...stroke} /></IconBase>;
}

export function FrownIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M8.5 16c.9-1.3 2-2 3.5-2s2.6.7 3.5 2M9 9.8h.01M15 9.8h.01" {...stroke} /></IconBase>;
}

export function MehIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M8.8 15h6.4M9 9.8h.01M15 9.8h.01" {...stroke} /></IconBase>;
}

export function SparkleIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8L12 4ZM19 17v3M17.5 18.5h3" {...stroke} /></IconBase>;
}

export function InfoIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 11v5M12 8h.01" {...stroke} /></IconBase>;
}

export function GripIcon(props: IconProps) {
  return <IconBase {...props}><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" /></IconBase>;
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6" {...stroke} /></IconBase>;
}

export function StarIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7L12 4Z" {...stroke} /></IconBase>;
}

export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 9 6 6 6-6" {...stroke} /></IconBase>;
}

export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z" {...stroke} /></IconBase>;
}

export function ChartIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 20V13M10 20V8M15 20v-5M20 20V5" {...stroke} /></IconBase>;
}

export function LogOutIcon(props: IconProps) {
  return <IconBase {...props}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" {...stroke} /></IconBase>;
}
