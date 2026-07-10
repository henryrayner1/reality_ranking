import { backendUrl } from "./apiBase";

export const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
        <div className="mb-6">
            <h1 className="text-[20px] font-medium">{title}</h1>
            <p className="mt-1 text-sm text-[#888]">{subtitle}</p>
        </div>
    );
};

export const StatCard = ({ label, value }: { label: string; value: number | string }) => {
    return (
        <div className="rounded-lg bg-[#f5f5f5] p-4">
            <div className="mb-1 text-xs text-[#888]">{label}</div>
            <div className="text-[22px] font-medium">{value}</div>
        </div>
    );
};

export const  TwoCol = ({ children }: { children: React.ReactNode }) => {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
};

export const Card = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
        <div className="mb-4 rounded-xl border border-[#e5e5e5] bg-white py-5 px-3">
            <div className="mb-4 border-b border-[#e5e5e5] pb-3 text-sm font-medium">{title}</div>
            {children}
        </div>
    );
};

export const FormGroup = ({ label, children }: { label: string; children: React.ReactNode }) => {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#888]">{label}</label>
            {children}
        </div>
    );
};

export const inputClassName = "w-full rounded-lg border border-[#ccc] bg-white px-2.5 py-[0.45rem] text-sm text-[#111] outline-none";
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => { return <input className={inputClassName} {...props} />; };
export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => { return <select className={inputClassName} {...props} />; };
export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => { return <textarea className={`${inputClassName} min-h-20 resize-y`} {...props} />; };

export const Toggle = ({ checked, onChange, disabled, title }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; title?: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            title={title}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-none p-0 transition-colors duration-200 ${checked ? 'bg-[#596dff]' : 'bg-[#bcbcbc]'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            <span
                aria-hidden="true"
                className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
                style={{ background: '#ffffff' }}
            />
        </button>
    );
};

export const PrimaryButton = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => {
    return <button onClick={onClick} disabled={disabled} className={`rounded-lg border-none px-4 py-2 text-[13px] font-medium text-white ${disabled ? 'cursor-not-allowed bg-[#aaa]' : 'cursor-pointer bg-[#7F77DD]'}`}>{children}</button>;
};
export const DangerButton = ({ onClick }: { onClick: () => void }) => {
    return <button onClick={onClick} className="cursor-pointer rounded-lg border border-[#F7C1C1] bg-transparent px-[0.6rem] py-[0.3rem] text-xs text-[#A32D2D]">Remove</button>;
};
export const SecondaryButton = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean }) => {
    return <button onClick={onClick} disabled={disabled} className={`rounded-lg border border-[#ccc] bg-transparent px-[0.6rem] py-[0.3rem] text-xs text-[#333] ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>{children}</button>;
};
export const ListItem = ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => {
    return <div className="flex items-center justify-between border-b border-[#e5e5e5] py-3">
            <div className="flex items-center gap-2.5">{left}</div>
            <div className="flex items-center gap-1.5">{right}</div>
        </div>
};
export const ItemInfo = ({ name, meta }: { name: string; meta: string }) =>{
    return <div>
            <div className="text-sm font-medium text-left">{name}</div>
            <div className="mt-0.5 text-xs text-[#888] text-left">{meta}</div>
        </div>
};
export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="text-sm font-medium">{title}</div>
                    <button onClick={onClose} className="cursor-pointer border-none bg-transparent text-lg leading-none text-[#888]">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

export const EmptyState = ({ message }: { message: string }) => {
    return <div className="p-8 text-center text-sm text-[#888]">{message}</div>;
};
export const ErrorMsg = () =>{
    return <p className="text-xs text-[#A32D2D]">Something went wrong. Try again.</p>;
};

export type BadgeVariant = 'purple' | 'green' | 'red' | 'gray' | 'amber'
export const BADGE_STYLES: Record<BadgeVariant, string> = {
    purple: 'bg-[#EEEDFE] text-[#534AB7]',
    green:  'bg-[#EAF3DE] text-[#3B6D11]',
    red:    'bg-[#FCEBEB] text-[#A32D2D]',
    gray:   'bg-[#F1EFE8] text-[#5F5E5A]',
    amber:  'bg-[#FAEEDA] text-[#854F0B]',
}
export const Badge = ({ label, variant }: { label: string; variant: BadgeVariant }) => {
    return <span className={`${BADGE_STYLES[variant]} inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-medium`}>{label}</span>;
};

export const AVATAR_COLORS = [
    { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
    { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
    { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
    { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
    { bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
]

const AVATAR_SIZE_CLASSES: Record<number, string> = {
    24: 'h-6 w-6 text-[8px]',
    32: 'h-8 w-8 text-[10px]',
    36: 'h-9 w-9 text-xs',
    40: 'h-10 w-10 text-[13px]',
    48: 'h-12 w-12 text-base',
};

export const Avatar = ({ name, photoUrl, rounded = false, size = 36 }: { name: string; photoUrl?: string; rounded?: boolean; size?: number }) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const { bg, text } = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
    const sizeClass = AVATAR_SIZE_CLASSES[size] ?? AVATAR_SIZE_CLASSES[36]

    return (
        <div className={`${sizeClass} ${rounded ? 'rounded-lg' : 'rounded-full'} ${bg} ${text} flex flex-shrink-0 items-center justify-center overflow-hidden font-medium`}>
        {photoUrl ? <img src={backendUrl(photoUrl)} alt={name} className="h-full w-full object-cover" /> : initials}
        </div>
    )
}
