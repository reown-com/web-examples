import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Transfer from "./transfer";

export default function Home() {
  return (
    <main>
      <div>
        <Card>
          <CardHeader>
            <w3m-button />
          </CardHeader>
          <CardContent>
            <Transfer></Transfer>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
