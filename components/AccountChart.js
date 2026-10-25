'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ledgerSeries, eur } from '@/lib/calc';

const PERIODS = [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']];
const RANGES = [['1M', '1 mois', 31], ['3M', '3 mois', 92], ['1A', '1 an', 366], ['ALL', 'Tout', 0]];
const UP = '#1f9d55', DOWN = '#d4463c';

/** Graphique de mes comptes : bougies ou courbe, période et plage réglables. */
export default function AccountChart({ ledger }) {
  const box = useRef(null);
  const [type, setType] = useState('candles');
  const [period, setPeriod] = useState('day');
  const [range, setRange] = useState('ALL');
  const [bars, setBars] = useState(true);
  const [hover, setHover] = useState(null);

  const data = useMemo(() => {
    const days = RANGES.find((r) => r[0] === range)[2];
    const from = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : '';
    // Le solde de départ tient compte de ce qui précède la plage affichée.
    const before = from ? ledger.filter((x) => x.date < from) : [];
    const start = before.length ? before[before.length - 1].balance : 0;
    const inRange = ledger.filter((x) => !from || x.date >= from);
    return ledgerSeries(inRange, period, start);
  }, [ledger, period, range]);

  useEffect(() => {
    let chart, alive = true;
    (async () => {
      const LW = await import('lightweight-charts');
      if (!alive || !box.current) return;
      box.current.innerHTML = '';
      chart = LW.createChart(box.current, {
        autoSize: true,
        layout: { background: { color: 'transparent' }, textColor: '#86868b', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
        grid: { vertLines: { color: 'rgba(0,0,0,0.04)' }, horzLines: { color: 'rgba(0,0,0,0.05)' } },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: bars ? 0.3 : 0.08 } },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
        crosshair: { mode: 1 },
        localization: { locale: 'fr-FR', priceFormatter: (v) => eur(v) },
        handleScroll: true, handleScale: true,
      });
      let main;
      if (type === 'candles') {
        main = chart.addCandlestickSeries({ upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN });
        main.setData(data.candles);
      } else {
        main = chart.addAreaSeries({ lineColor: '#1d1d1f', lineWidth: 2.5, topColor: 'rgba(29,29,31,0.18)', bottomColor: 'rgba(29,29,31,0)', lineType: 0 });
        main.setData(data.line);
      }
      main.createPriceLine({ price: 0, color: 'rgba(0,0,0,0.25)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      if (bars) {
        const h = chart.addHistogramSeries({ priceScaleId: 'pl', priceFormat: { type: 'custom', formatter: (v) => eur(v) } });
        chart.priceScale('pl').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 }, visible: false });
        h.setData(data.bars.map((b) => ({ ...b, color: b.value >= 0 ? 'rgba(31,157,85,0.55)' : 'rgba(212,70,60,0.6)' })));
      }
      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove((p) => {
        if (!p.time) return setHover(null);
        const c = data.candles.find((x) => x.time === p.time);
        const b = data.bars.find((x) => x.time === p.time);
        setHover(c ? { time: p.time, ...c, pl: b?.value ?? 0 } : null);
      });
    })();
    return () => { alive = false; chart?.remove(); };
  }, [data, type, bars]);

  const last = data.candles[data.candles.length - 1];
  const shown = hover || (last ? { ...last, pl: data.bars[data.bars.length - 1]?.value ?? 0 } : null);
  const fmtTime = (t) => new Date(t + 'T00:00:00').toLocaleDateString('fr-FR', period === 'month' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="chartcard">
      <div className="chartbar">
        <div className="seg">{[['candles', 'Bougies'], ['line', 'Courbe']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
        <div className="seg">{PERIODS.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}</div>
        <div className="seg">{RANGES.map(([k, l]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>)}</div>
        <label className="tog"><input type="checkbox" checked={bars} onChange={(e) => setBars(e.target.checked)} /> Gains / pertes</label>
      </div>
      <div className="ohlc">
        {shown ? (
          <>
            <span className="m">{fmtTime(shown.time)}</span>
            {type === 'candles' && <><span>Ouv. <b>{eur(shown.open)}</b></span><span>Haut <b>{eur(shown.high)}</b></span><span>Bas <b>{eur(shown.low)}</b></span></>}
            <span>Solde <b>{eur(shown.close)}</b></span>
            <span className={shown.pl >= 0 ? 'pos' : 'neg'}><b>{eur(shown.pl, true)}</b> sur la période</span>
          </>
        ) : <span className="m">Aucune opération sur cette période.</span>}
      </div>
      <div ref={box} className="chartbox" />
      {data.candles.length === 0 && <div className="chartempty">Tes ventes et tes frais apparaîtront ici.</div>}
    </div>
  );
}
