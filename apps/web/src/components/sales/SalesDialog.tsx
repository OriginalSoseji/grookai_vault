"use client";
import { useEffect, useRef, type ReactNode } from 'react';
import s from './SalesDesk.module.css';
/** Native modal keeps keyboard focus inside and restores it on dismissal. */
export default function SalesDialog({ children, label, className, busy = false, onClose }: {
    children: ReactNode;
    label: string;
    className: string;
    busy?: boolean;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
    return <dialog ref={ref} className={`${s.dialog} ${className}`} aria-label={label} onCancel={event => { event.preventDefault(); if (!busy)
        onClose(); }}>{children}</dialog>;
}
