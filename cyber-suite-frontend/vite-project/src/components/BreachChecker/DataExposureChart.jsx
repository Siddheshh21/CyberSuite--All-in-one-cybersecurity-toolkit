import React, { useMemo } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

export default function DataExposureChart({ breaches = [] }){
  const counts = useMemo(()=> {
    const map = { Email:0, Password:0, Phone:0, Address:0, CreditCard:0, Other:0 };
    for (const b of breaches) {
      for (const d of b.data_classes || []) {
        const s = String(d).toLowerCase();
        if (s.includes("password")) map.Password++;
        else if (s.includes("email")) map.Email++;
        else if (s.includes("phone")) map.Phone++;
        else if (s.includes("address")) map.Address++;
        else if (s.includes("credit")) map.CreditCard++;
        else map.Other++;
      }
    }
    return map;
  }, [breaches]);



  // Component removed: no longer needed for new UI
}
import React, { useMemo } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

export default function DataExposureChart({ breaches = [] }){
  const counts = useMemo(()=> {
    const map = { Email:0, Password:0, Phone:0, Address:0, CreditCard:0, Other:0 };
    for (const b of breaches) {
      for (const d of b.data_classes || []) {
        const s = String(d).toLowerCase();
        if (s.includes("password")) map.Password++;
        else if (s.includes("email")) map.Email++;
        else if (s.includes("phone")) map.Phone++;
        else if (s.includes("address")) map.Address++;
        else if (s.includes("credit")) map.CreditCard++;
        else map.Other++;
      }
    }
    return map;
  }, [breaches]);

  const labels = ["Emails","Passwords","Phone","Address","Credit Card","Other"];
  const dataVals = [counts.Email, counts.Password, counts.Phone, counts.Address, counts.CreditCard, counts.Other];

  const data = {
    labels,
    datasets: [{
      data: dataVals,
      backgroundColor: ["#60a5fa","#fb7185","#f59e0b","#34d399","#f97316","#94a3b8"],
      hoverOffset: 6,
    }]
  };

  return (
    <div className="p-4 rounded bg-white border">
      <div className="text-sm text-gray-600 mb-3">Data exposure breakdown</div>
      <div className="w-full h-44">
        <Pie data={data} options={{
          plugins: { legend: { position: "bottom", labels: { color: "#374151" } } }
        }} />
      </div>
      <div className="mt-2 text-xs text-gray-500">Items counted: {dataVals.reduce((a,b)=>a+b,0)}</div>
    </div>
  );
}
