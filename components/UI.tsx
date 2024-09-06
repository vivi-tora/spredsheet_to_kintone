// UI.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const PasswordForm: React.FC<{
  onSubmit: (password: string) => void;
}> = ({ onSubmit }) => {
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };


  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
            />
            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const ExecuteButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
}> = ({ onClick, disabled }) => (
  <div className="flex justify-center mt-4">
    <Button onClick={onClick} disabled={disabled}>
      実行
    </Button>
  </div>
);

export const LoadingIndicator: React.FC<{ message: string | null }> = ({
  message,
}) => (
  <div className="flex justify-center items-center min-h-screen">
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading...</p>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const ResultsTable: React.FC<{ data: any }> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex justify-center mt-4">
        <Card>
          <CardContent>データがありません。</CardContent>
        </Card>
      </div>
    );
  }

  if (!Array.isArray(data)) {
    return (
      <div className="flex justify-center mt-4">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>正常に登録できました！</CardTitle>
          </CardHeader>
          <CardContent>
            <p>データの型: {typeof data}</p>
            <pre className="mt-2 p-2 bg-gray-100 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center mt-4">
        <Card>
          <CardContent>データが空です。</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center mt-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>結果</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>単品JAN</TableHead>
                <TableHead>kintone</TableHead>
                <TableHead>情報</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.janCode}</TableCell>
                  <TableCell>{item.kintoneStatus}</TableCell>
                  <TableCell>{item.infoStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
