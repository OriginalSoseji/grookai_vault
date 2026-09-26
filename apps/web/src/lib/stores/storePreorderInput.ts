export type PreorderTerms = {
  title: string; description: string; expected_date: string; price_cents: number;
  allocation_limit: number; payment_mode: "reservation" | "full" | "deposit";
  deposit_cents: number | null; terms: string;
};
export type StorePreorder = PreorderTerms & { id: string; version: number; status: "draft" | "archived"; currency: "USD"; updated_at: string };
export function preorderId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid preorder ID");
  return value;
}
export function preorderTerms(input: Record<string, unknown>): PreorderTerms {
  const string = (key: string, min: number, max: number) => { const v=input[key]; if(typeof v!=="string" || v.trim().length<min || v.trim().length>max) throw new Error("Check " + key.replaceAll("_", " ")); return v.trim(); };
  const title=string("title",1,120), description=string("description",0,2000), terms=string("terms",1,4000), expected_date=string("expected_date",10,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expected_date) || !Number.isFinite(Date.parse(expected_date)) || new Date(expected_date).toISOString().slice(0,10)!==expected_date) throw new Error("Choose a valid expected availability date");
  const price_cents=input.price_cents, allocation_limit=input.allocation_limit, deposit_cents=input.deposit_cents, payment_mode=input.payment_mode;
  if(typeof price_cents!=="number" || !Number.isInteger(price_cents) || price_cents<1 || price_cents>100000000) throw new Error("Enter a positive price with at most two decimal places");
  if(typeof allocation_limit!=="number" || !Number.isInteger(allocation_limit) || allocation_limit<1 || allocation_limit>100000) throw new Error("Allocation must be a whole number from 1 to 100,000");
  if(payment_mode!=="reservation" && payment_mode!=="full" && payment_mode!=="deposit") throw new Error("Choose payment terms");
  if(payment_mode==="deposit" ? typeof deposit_cents!=="number" || !Number.isInteger(deposit_cents) || deposit_cents<1 || deposit_cents>=price_cents : deposit_cents!==null) throw new Error("A deposit must be greater than zero and less than the total price; other modes have no deposit");
  return {title,description,expected_date,price_cents,allocation_limit,payment_mode,deposit_cents:deposit_cents as number|null,terms};
}
export function preorderCents(value: string): number {
  if(!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Use an amount with at most two decimal places");
  return Math.round(Number(value)*100);
}
