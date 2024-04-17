import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1>Slycat Embed Example</h1>
        <iframe
          src="https://localhost:9000/models/737adc5b3949418886a1e8bb30419222?embed&hideTable&hideFilters&hideControls&bid=33438b7c9af95a61412cde73962159c1"
          className="w-full grow"
        />
    </main>
  );
}
