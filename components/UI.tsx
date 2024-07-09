import React from 'react';

export const PasswordForm: React.FC<{ onSubmit: (password: string) => void }> = ({ onSubmit }) => {
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワードを入力"
      />
      <button type="submit">ログイン</button>
    </form>
  );
};

export const ExecuteButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({ onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}>
    実行
  </button>
);

export const LoadingIndicator: React.FC<{ message: string | null }> = ({ message }) => (
  <div>
    <div>Loading...</div>
    {message && <div>{message}</div>}
  </div>
);

export const ResultsTable: React.FC<{ data: any[] }> = ({ data }) => (
  <table>
    <thead>
      <tr>
        <th>商品名</th>
        <th>単品JAN</th>
        <th>kintone</th>
        <th>情報</th>
      </tr>
    </thead>
    <tbody>
      {data.map((item, index) => (
        <tr key={index}>
          <td>{item.productName}</td>
          <td>{item.janCode}</td>
          <td>{item.kintoneStatus}</td>
          <td>{item.infoStatus}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
