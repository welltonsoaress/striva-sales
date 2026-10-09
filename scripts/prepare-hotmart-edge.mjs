import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

// Empacotamento reproduzível: a Edge usa os mesmos processadores testados no Next.
// A pasta de destino é externa ao repositório e nunca contém credenciais.
const target = process.argv[2];
if (!target) throw new Error("Informe uma pasta de destino para o pacote da função.");
const source = resolve("supabase/functions/handle-payment-webhook");
const files = ["hotmart", "process-hotmart", "process-hotmart-cancellation", "receive-hotmart"];
mkdirSync(join(target, "lib"), { recursive: true });
for (const name of ["index.ts", "deno.json", "deno.lock"])
  writeFileSync(join(target, name), readFileSync(join(source, name)));
for (const name of files) {
  const content = readFileSync(resolve(`lib/billing/${name}.ts`), "utf8").replace(
    /from "(\.\/[^".]+)"/g,
    'from "$1.ts"',
  );
  writeFileSync(join(target, "lib", `${name}.ts`), content);
}
process.stdout.write(JSON.stringify({ target: resolve(target), modules: files.length }));
