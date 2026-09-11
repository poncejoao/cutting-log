import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Componente isolado só pra poder ser carregado via React.lazy — o recharts
// é a maior dependência do bundle e só é necessário na aba Progresso, então
// não faz sentido baixar/parsear ele no primeiro carregamento do app.
export default function MiniLineChart({
  data,
  dataKey,
  yDomain,
  height = 180,
  wrapperStyle,
  tooltipFormatter,
  valueSuffix = "",
}) {
  return (
    <div style={{ height, ...wrapperStyle }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} domain={yDomain} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--text)" }}
            formatter={tooltipFormatter || ((value) => [`${value}${valueSuffix}`, null])}
          />
          <Line type="monotone" dataKey={dataKey} stroke="var(--push)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
