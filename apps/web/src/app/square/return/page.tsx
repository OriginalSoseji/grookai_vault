import Link from 'next/link';
export const dynamic='force-dynamic';
export default function SquareNativeReturn(){
 return <main style={{maxWidth:560,margin:'48px auto',padding:24}}><h1>Square connected</h1>
  <p>Return to grookai vault to choose your Square location and automatic sync settings.</p>
  <p><a href="grookai://square/return">Open grookai vault</a></p>
  <p><Link href="/account/connections/square">Manage Square on the website</Link></p></main>;
}
