import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1>Slycat Embed Example</h1>
        <iframe
          src="https://localhost:9000/models/d6b9d0c45b194a6e9a1b2f56835f2f3e?bid=1bf973f86734f0af085fb986ac42cf18"
          className="w-full grow"
        />
    </main>
  );
}
