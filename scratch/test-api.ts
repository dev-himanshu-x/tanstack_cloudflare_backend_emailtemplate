import { createServerFn } from "@tanstack/react-start";

console.log("createServerFn type:", typeof createServerFn);
const fn = createServerFn({ method: "POST" });
console.log("fn keys:", Object.keys(fn));
console.log("fn.validator type:", typeof (fn as any).validator);
console.log("fn.handler type:", typeof (fn as any).handler);
