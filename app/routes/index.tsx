import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/")({
  loader: () => getData(),
  component: RouteComponent,
});

const getData = createServerFn().handler(() => {
  // Access bindings via env
  // For example: env.MY_KV, env.MY_BUCKET, env.AI, etc.
});

function RouteComponent() {
  // ...
}