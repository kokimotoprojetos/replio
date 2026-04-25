import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <SignIn routing="path" path="/sign-in" appearance={{
        elements: {
          formButtonPrimary: 'btn btn-primary',
          card: 'glass-card'
        }
      }} />
    </div>
  );
}
