// Placeholder so the registry tsconfig resolves @/lib/utils.
// Consumers will have their own cn() from shadcn/ui.
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
