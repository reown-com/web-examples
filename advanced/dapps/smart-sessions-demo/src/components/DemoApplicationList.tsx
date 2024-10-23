import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { DemoAppMetadata } from "@/utils/DataUtil";
import { ArrowRightIcon } from "lucide-react";

interface DemoApplicationsProps {
  demoAppsMetadata: DemoAppMetadata[];
}

export default function DemoApplicationList({
  demoAppsMetadata,
}: DemoApplicationsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Applications</h2>
      <div className="flex flex-col space-y-4">
        {demoAppsMetadata.map((appMetadata) => (
          <DemoApplication key={appMetadata.title} {...appMetadata} />
        ))}
      </div>
    </div>
  );
}

const DemoApplication: React.FC<DemoAppMetadata> = React.memo(
  function DemoApplication({ title, link, description }: DemoAppMetadata) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <CardDescription className="flex-grow text-sm text-muted-foreground">
              {description}
            </CardDescription>
            <Link href={link}>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                aria-label={`Go to ${title}`}
              >
                Go
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  },
);
