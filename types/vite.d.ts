import "vite";

declare module "vite" {
  interface ServerOptions {
    preset?: string;
  }
}
