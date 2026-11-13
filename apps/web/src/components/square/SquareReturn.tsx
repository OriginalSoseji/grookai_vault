'use client';

import Link from 'next/link';
import {useEffect} from 'react';
import s from './SquareManager.module.css';

export default function SquareReturn({connected,native}: {connected: boolean;native:boolean}) {
  useEffect(() => {
    // Fixed credential-free app URL. The app refreshes authenticated server
    // state; a return URL never establishes that linking succeeded.
    if(native)window.location.assign('grookai://square/return');
  }, [native]);
  return <div className={s.page}>
    <h1>{connected ? 'Square connected' : 'Square connection not completed'}</h1>
    <p>{connected ? 'Return to grookai vault to finish setup. Your Square locations will load automatically.'
      : 'Return to grookai vault and try connecting again. Your existing cards and connection settings are preserved.'}</p>
    <div className={s.actions}>
      {native ? <>
        <a className={`${s.button} ${s.primary}`} href="grookai://square/return">Open grookai vault</a>
        <Link className={s.button} href="/account/connections/square">Continue on the website</Link>
      </> : <>
        <Link className={`${s.button} ${s.primary}`} href="/account/connections/square">Continue on the website</Link>
        <a className={s.button} href="grookai://square/return">Open grookai vault</a>
      </>}
    </div>
    <p className={s.muted}>If the app did not open, tap Open grookai vault. On a computer, continue on the website.</p>
  </div>;
}
