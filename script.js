/**
 * Calculadora de Liquidación Laboral — El Salvador
 * Fórmulas basadas en el Código de Trabajo (Decreto N° 15, 1972) y en la
 * Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (2014).
 *
 * Convenciones (Juzgados de lo Laboral):
 *  - Mes comercial = 30 días; año comercial = 360 días; jornada = 8 horas.
 *  - La antigüedad INCLUYE el último día laborado: del 01/01/2015 al
 *    30/09/2021 resultan 6 años y 9 meses.
 *  - El aguinaldo proporcional se devenga desde el 12 de diciembre del último
 *    aguinaldo pagado (por defecto, el 12/dic anterior a la terminación),
 *    no desde el aniversario de ingreso (Arts. 196–198 CT).
 *
 * Topes de ley: se usan contra el salario mínimo legal de referencia
 * $408.80 (comercio, servicios e industria; Decreto Ejecutivo N.º 11,
 * vigente desde el 1 de junio de 2025):
 *  - Indemnización por despido (Art. 58 CT): tope 4 × SM = $1,635.20.
 *  - Prestación por renuncia (Ley 592, Art. 4): tope 2 × SM = $817.60.
 *
 * Tabla de retención de ISR: Decreto Legislativo N.º 293 (30 de abril de
 * 2025), vigente desde mayo 2025 (límite exento de $550 mensuales).
 */

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const fmtFrac = (n) => {
  let s = n.toFixed(4);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
};

const fmtDate = (isoStr) => {
  if (!isoStr) return '— No especificada —';
  const [y, m, d] = isoStr.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
};

const setTxt = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

// Salario mínimo legal de referencia (solo para los topes de ley).
const SALARIO_MINIMO_LEY = 408.80;

const form = document.getElementById('calc-form');
const errorBox = document.getElementById('error-box');
const resultSection = document.getElementById('resultado');

// --- "No aplica" toggles: disable and zero the paired numeric field ---
document.querySelectorAll('[data-skip]').forEach((checkbox) => {
  const targetId = checkbox.dataset.skip;
  const input = document.getElementById(targetId);
  checkbox.addEventListener('change', () => {
    input.disabled = checkbox.checked;
    if (checkbox.checked) input.value = 0;
  });
});

const aniosInput = document.getElementById('anios');
const mesesInput = document.getElementById('meses');
const mesesHint = document.getElementById('meses-hint');
const fechaIngresoInput = document.getElementById('fechaIngreso');
const fechaTerminacionInput = document.getElementById('fechaTerminacion');

const toISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Antigüedad exacta (años, meses, días) entre dos fechas ISO, INCLUYENDO el
 * último día laborado (convención judicial: del 01/01/2015 al 30/09/2021
 * resultan 6 años y 9 meses, no 6 años, 8 meses y 29 días).
 * Devuelve null si faltan datos o si la terminación no es posterior al ingreso.
 */
function diffFechas(isoIngreso, isoTerminacion) {
  if (!isoIngreso || !isoTerminacion) return null;
  const ingreso = new Date(isoIngreso + 'T00:00:00');
  const term = new Date(isoTerminacion + 'T00:00:00');
  if (isNaN(ingreso) || isNaN(term) || term <= ingreso) return null;

  let anios = term.getFullYear() - ingreso.getFullYear();
  let meses = term.getMonth() - ingreso.getMonth();
  let dias = term.getDate() - ingreso.getDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(term.getFullYear(), term.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
    if (dias < 0) { // mes de ingreso de 30–31 días cruzando febrero (convención comercial)
      meses -= 1;
      dias += 30;
    }
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  // El último día laborado cuenta como día de servicio:
  dias += 1;
  if (dias >= 30) { dias -= 30; meses += 1; }
  if (meses >= 12) { meses -= 12; anios += 1; }

  return { anios, meses, dias };
}

/**
 * Fecha base de devengo del aguinaldo: el 12 de diciembre más reciente anterior
 * (o igual) a la terminación — presunción de último aguinaldo pagado —, salvo
 * que el ingreso sea posterior, en cuyo caso se cuenta desde el ingreso.
 */
function fechaBaseAguinaldo(fechaTerminacion, fechaIngreso) {
  const term = new Date(fechaTerminacion + 'T00:00:00');
  let base = new Date(term.getFullYear(), 11, 12);
  if (term < base) base = new Date(term.getFullYear() - 1, 11, 12);
  if (fechaIngreso) {
    const ing = new Date(fechaIngreso + 'T00:00:00');
    if (!isNaN(ing) && ing > base) base = ing;
  }
  return base;
}

function sincronizarAntiguedadPorFechas() {
  const calc = diffFechas(fechaIngresoInput.value, fechaTerminacionInput.value);
  if (calc) {
    aniosInput.value = calc.anios;
    mesesInput.value = calc.meses;
    aniosInput.readOnly = true;
    mesesInput.readOnly = true;
    mesesHint.textContent = `Calculado de las fechas: ${calc.anios} años, ${calc.meses} meses` +
      `${calc.dias > 0 ? ` y ${calc.dias} días` : ''} (incluye el último día laborado).`;
  } else {
    aniosInput.readOnly = false;
    mesesInput.readOnly = false;
    mesesHint.textContent = 'Fracción del año actual (0–11)';
  }
}
fechaIngresoInput.addEventListener('change', sincronizarAntiguedadPorFechas);
fechaTerminacionInput.addEventListener('change', sincronizarAntiguedadPorFechas);

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  resultSection.classList.add('hidden');
}

function clearError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

function diasAguinaldoPorAntiguedad(anios) {
  if (anios < 3) return 15;
  if (anios <= 10) return 19;
  return 21;
}

/* ---------- Monto en letras (español, formato de comprobante legal) ---------- */
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function apocope(str) {
  if (str === 'veintiuno') return 'veintiún';
  if (str.endsWith(' uno')) return str.slice(0, -3) + 'un';
  return str;
}

function convertirGrupo(n) {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  let out = '';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) out += CENTENAS[c] + ' ';
  if (resto > 0) {
    if (resto <= 20) {
      out += UNIDADES[resto];
    } else if (resto < 30) {
      out += 'veinti' + UNIDADES[resto - 20];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      out += DECENAS[d];
      if (u > 0) out += ' y ' + UNIDADES[u];
    }
  }
  return out.trim();
}

function numeroALetras(num) {
  num = Math.floor(num);
  if (num === 0) return 'cero';

  let out = '';
  const millones = Math.floor(num / 1000000);
  const resto1 = num % 1000000;
  const miles = Math.floor(resto1 / 1000);
  const cientos = resto1 % 1000;

  if (millones > 0) {
    out += millones === 1 ? 'un millón ' : apocope(convertirGrupo(millones)) + ' millones ';
  }
  if (miles > 0) {
    out += miles === 1 ? 'mil ' : apocope(convertirGrupo(miles)) + ' mil ';
  }
  if (cientos > 0) {
    out += convertirGrupo(cientos);
  }
  return out.trim();
}

function montoEnLetras(monto) {
  const entero = Math.floor(monto + 1e-9);
  const centavos = Math.round((monto - entero) * 100);
  const centavosStr = String(centavos).padStart(2, '0');
  return `${numeroALetras(entero).toUpperCase()} ${centavosStr}/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA`;
}

/* ---------- Tabla de retención de ISR (Art. 37 Ley de ISR, tabla mensual) ----------
 * Decreto Legislativo N.º 293 (30 de abril de 2025), vigente desde mayo 2025:
 *   Tramo I:   $0.01    a $550.00    → Sin retención
 *   Tramo II:  $550.01  a $895.24    → Cuota fija $17.67 + 10% sobre el exceso de $550.00
 *   Tramo III: $895.25  a $2,038.10  → Cuota fija $60.00 + 20% sobre el exceso de $895.24
 *   Tramo IV:  $2,038.11 en adelante → Cuota fija $288.57 + 30% sobre el exceso de $2,038.10
 */
function calcularISR(rentaGravable) {
  if (rentaGravable <= 550.00) return 0;
  if (rentaGravable <= 895.24) return 17.67 + (rentaGravable - 550.00) * 0.10;
  if (rentaGravable <= 2038.10) return 60.00 + (rentaGravable - 895.24) * 0.20;
  return 288.57 + (rentaGravable - 2038.10) * 0.30;
}

function textoTramoISR(base) {
  if (base <= 550.00) return 'tramo I (hasta $550.00) → exento';
  if (base <= 895.24) return `tramo II: $17.67 + 10% × (${fmt.format(base)} − $550.00)`;
  if (base <= 2038.10) return `tramo III: $60.00 + 20% × (${fmt.format(base)} − $895.24)`;
  return `tramo IV: $288.57 + 30% × (${fmt.format(base)} − $2,038.10)`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  clearError();

  // --- I. Datos financieros y antigüedad ---
  const nombreTrabajador = document.getElementById('nombreTrabajador').value.trim();
  const patrono = document.getElementById('patrono').value.trim();
  const cargo = document.getElementById('cargo').value.trim();
  const fechaIngreso = fechaIngresoInput.value;
  const fechaTerminacion = fechaTerminacionInput.value;

  const salario = parseFloat(document.getElementById('salario').value);
  const causa = document.querySelector('input[name="causa"]:checked').value;

  // Si ambas fechas son válidas, la antigüedad (incluyendo días) se calcula de ellas
  // y tiene prioridad sobre los campos manuales de años/meses.
  if (fechaIngreso && fechaTerminacion && !diffFechas(fechaIngreso, fechaTerminacion)) {
    return showError('La fecha de terminación debe ser posterior a la fecha de ingreso.');
  }
  const antiguedadPorFechas = diffFechas(fechaIngreso, fechaTerminacion);
  const anios = antiguedadPorFechas ? antiguedadPorFechas.anios : parseInt(aniosInput.value, 10);
  const meses = antiguedadPorFechas ? antiguedadPorFechas.meses : parseInt(mesesInput.value, 10);
  const diasExtra = antiguedadPorFechas ? antiguedadPorFechas.dias : 0;

  // --- Jornadas extraordinarias y días especiales ---
  const heDiurnas = parseFloat(document.getElementById('heDiurnas').value) || 0;
  const heNocturnas = parseFloat(document.getElementById('heNocturnas').value) || 0;
  const diasAsueto = parseFloat(document.getElementById('diasAsueto').value) || 0;
  const diasDescanso = parseFloat(document.getElementById('diasDescanso').value) || 0;

  if (!salario || salario <= 0) return showError('Ingresa un salario mensual mayor a $0.');
  if (isNaN(anios) || anios < 0) return showError('Ingresa una cantidad válida de años laborados.');
  if (isNaN(meses) || meses < 0 || meses > 11) return showError('Los meses laborados deben estar entre 0 y 11.');

  // --- Salario básico diario y por hora ---
  const SBD = salario / 30;
  const H = SBD / 8;
  const fraccionAnio = (meses * 30 + diasExtra) / 360;
  const antiguedadTotal = anios + fraccionAnio;

  /* =========================================================
   * DESGLOSE DE PRESTACIONES LIQUIDADAS
   * ========================================================= */

  // Vacación proporcional (corre desde el aniversario de ingreso)
  const vacacionAnual = SBD * 15 * 1.3;
  const vacacionProporcional = vacacionAnual * fraccionAnio;

  // Aguinaldo proporcional (corre desde el último 12 de diciembre pagado)
  const diasAguinaldo = diasAguinaldoPorAntiguedad(anios);
  const aguinaldoAnual = SBD * diasAguinaldo;

  let fraccionAguinaldo = fraccionAnio; // aproximación sin fechas
  let baseAguinaldoISO = null;
  let detalleAguinaldo = null;
  if (antiguedadPorFechas) {
    const base = fechaBaseAguinaldo(fechaTerminacion, fechaIngreso);
    baseAguinaldoISO = toISO(base);
    if (baseAguinaldoISO === fechaTerminacion) {
      fraccionAguinaldo = 0;
      detalleAguinaldo = { anios: 0, meses: 0, dias: 0 };
    } else {
      const d = diffFechas(baseAguinaldoISO, fechaTerminacion);
      if (d) {
        detalleAguinaldo = d;
        fraccionAguinaldo = (d.anios * 360 + d.meses * 30 + d.dias) / 360;
      }
    }
  }
  const aguinaldoProporcional = aguinaldoAnual * fraccionAguinaldo;

  // Indemnización (despido) o prestación por renuncia, con topes de ley
  let montoCausa = 0;
  let notaCausa = '';
  let etiquetaCausa = '';
  let legalCausa = '';
  let exentoNota = '';
  let topeCausa = 0;
  let baseAnualCausa = 0;
  let minimoLegal = 0;
  let aplicaMinimo = false;

  if (causa === 'despido') {
    etiquetaCausa = 'Indemnización por despido injustificado';
    legalCausa = 'Art. 58 CT';
    exentoNota = 'indemnización y aguinaldo';
    topeCausa = SALARIO_MINIMO_LEY * 4;
    const salarioBase = Math.min(salario, topeCausa);
    baseAnualCausa = salarioBase; // SBD_capado × 30 = salario base capado
    montoCausa = salarioBase * anios + salarioBase * fraccionAnio;
    minimoLegal = SBD * 15;
    if (montoCausa < minimoLegal) {
      montoCausa = minimoLegal;
      aplicaMinimo = true;
    }
    if (salario > topeCausa) {
      notaCausa = `Se aplicó el tope legal de 4 salarios mínimos (${fmt.format(topeCausa)}; salario mínimo de referencia ${fmt.format(SALARIO_MINIMO_LEY)} — comercio, servicios e industria) porque el salario ingresado lo supera (Art. 58 CT).`;
    }
  } else {
    etiquetaCausa = 'Prestación económica por renuncia voluntaria';
    legalCausa = 'Ley de Prestación por Renuncia Voluntaria (2014), Arts. 2 y 4';
    exentoNota = 'prestación por renuncia y aguinaldo';
    if (antiguedadTotal < 2) {
      montoCausa = 0;
      notaCausa = 'No aplica: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria exige un mínimo de 2 años de servicio continuo (Art. 2).';
    } else {
      topeCausa = SALARIO_MINIMO_LEY * 2;
      const salarioBase = Math.min(salario, topeCausa);
      baseAnualCausa = salarioBase / 30 * 15; // SBD_capado × 15
      montoCausa = baseAnualCausa * anios + baseAnualCausa * fraccionAnio;
      if (salario > topeCausa) {
        notaCausa = `Se aplicó el tope legal de 2 salarios mínimos (${fmt.format(topeCausa)}; salario mínimo de referencia ${fmt.format(SALARIO_MINIMO_LEY)} — comercio, servicios e industria) porque el salario ingresado lo supera (Ley de Renuncia Voluntaria, Art. 4).`;
      }
    }
  }

  const subtotalHeDiurnas = H * heDiurnas * 2;
  const subtotalHeNocturnas = H * heNocturnas * 2 * 1.25;
  const montoAsueto = SBD * 2 * diasAsueto;
  const montoDescanso = SBD * 1.5 * diasDescanso;

  const totalDevengado = vacacionProporcional + aguinaldoProporcional + montoCausa +
    subtotalHeDiurnas + subtotalHeNocturnas + montoAsueto + montoDescanso;

  /* =========================================================
   * DEDUCCIONES DE LEY Y NETO A PAGAR
   * ========================================================= */

  const montoExento = montoCausa + aguinaldoProporcional;
  const remuneracionGravada = totalDevengado - montoExento;

  const ISSS_RATE = 0.03;
  const ISSS_TOPE = 1000;
  const AFP_RATE = 0.0725;

  const baseISSS = Math.min(remuneracionGravada, ISSS_TOPE);
  const cotizacionISSS = baseISSS * ISSS_RATE;
  const cotizacionAFP = remuneracionGravada * AFP_RATE;

  const baseISR = Math.max(remuneracionGravada - cotizacionISSS - cotizacionAFP, 0);
  const retencionISR = calcularISR(baseISR);

  const totalDeducciones = cotizacionISSS + cotizacionAFP + retencionISR;
  const montoNeto = totalDevengado - totalDeducciones;

  /* =========================================================
   * Pintar I. Datos de las partes (comprobante)
   * ========================================================= */
  document.getElementById('r-nombreTrabajador').textContent = nombreTrabajador || '— No especificada —';
  document.getElementById('r-patrono').textContent = patrono || '— No especificado —';
  document.getElementById('r-cargo').textContent = cargo || '— No especificado —';
  document.getElementById('r-salario').textContent = fmt.format(salario);
  document.getElementById('r-fechaIngreso').textContent = fechaIngreso ? fmtDate(fechaIngreso) : '— No especificada —';
  document.getElementById('r-fechaTerminacion').textContent = fechaTerminacion ? fmtDate(fechaTerminacion) : '— No especificada —';
  document.getElementById('r-antiguedad').textContent = diasExtra > 0
    ? `${anios} años, ${meses} meses, ${diasExtra} días`
    : `${anios} años, ${meses} meses`;
  document.getElementById('r-causaLabel2').textContent = causa === 'despido' ? 'Despido injustificado' : 'Renuncia voluntaria';

  /* =========================================================
   * Pintar II. Desglose de prestaciones liquidadas
   * ========================================================= */
  document.getElementById('r-vacacion').textContent = fmt.format(vacacionProporcional);
  document.getElementById('r-aguinaldo').textContent = fmt.format(aguinaldoProporcional);
  document.getElementById('r-causa-label').textContent = etiquetaCausa;
  document.getElementById('r-causa-legal').textContent = legalCausa;
  document.getElementById('r-causa').textContent = fmt.format(montoCausa);
  document.getElementById('r-heDiurnas').textContent = fmt.format(subtotalHeDiurnas);
  document.getElementById('r-heNocturnas').textContent = fmt.format(subtotalHeNocturnas);
  document.getElementById('r-asueto').textContent = fmt.format(montoAsueto);
  document.getElementById('r-descanso').textContent = fmt.format(montoDescanso);
  document.getElementById('r-total').textContent = fmt.format(totalDevengado);
  document.getElementById('r-nota').textContent = notaCausa;

  /* =========================================================
   * Pintar III. Deducciones de ley y neto a pagar
   * ========================================================= */
  document.getElementById('r-gravada').textContent = fmt.format(remuneracionGravada);
  document.getElementById('r-exento').textContent = fmt.format(montoExento);
  document.getElementById('r-exento-nota').textContent = exentoNota;
  document.getElementById('r-isss').textContent = fmt.format(cotizacionISSS);
  document.getElementById('r-afp').textContent = fmt.format(cotizacionAFP);
  document.getElementById('r-isr').textContent = fmt.format(retencionISR);
  document.getElementById('r-deducciones').textContent = fmt.format(totalDeducciones);
  document.getElementById('r-neto').textContent = fmt.format(montoNeto);
  document.getElementById('r-neto-letras').textContent = montoEnLetras(montoNeto);

  /* =========================================================
   * Pintar IV. Declaración
   * ========================================================= */
  const nombreDecl = nombreTrabajador || 'La persona trabajadora';
  document.getElementById('r-declaracion').textContent =
    `${nombreDecl} declara haber recibido el detalle de las prestaciones económicas que anteceden, ` +
    `calculadas conforme al Código de Trabajo de El Salvador, así como el desglose de las retenciones de ley ` +
    `aplicadas y el monto neto resultante. Este comprobante se suscribe en la fecha que se indica al pie de las firmas.`;

  const ahora = new Date();
  document.getElementById('r-generado').textContent =
    `Generado el ${ahora.toLocaleDateString('es-SV')} ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`;

  /* =========================================================
   * Metodología dinámica: fórmulas con los datos del usuario
   * ========================================================= */

  // 1–3. Bases
  setTxt('m-sbd-calc', fmt.format(salario));
  setTxt('m-sbd', fmt.format(SBD));
  setTxt('m-h-calc', fmt.format(SBD));
  setTxt('m-h', fmt.format(H));
  setTxt('m-antiguedad',
    `${anios} año${anios === 1 ? '' : 's'}, ${meses} mes${meses === 1 ? '' : 'es'}${diasExtra > 0 ? ` y ${diasExtra} día${diasExtra === 1 ? '' : 's'}` : ''}`);
  setTxt('m-fraccion-calc', `(${meses} × 30 + ${diasExtra}) ÷ 360`);
  setTxt('m-fraccion', fmtFrac(fraccionAnio));

  // 4. Vacación
  setTxt('m-vac-calc', `${fmt.format(SBD)} × 15 × 1.30`);
  setTxt('m-fraccion2', fmtFrac(fraccionAnio));
  setTxt('m-vac', fmt.format(vacacionProporcional));

  // 5. Aguinaldo
  setTxt('m-agu-cat',
    `${diasAguinaldo} días de salario (${anios} año${anios === 1 ? '' : 's'} de servicio → ` +
    `${anios < 3 ? 'categoría 1: menos de 3 años' : anios <= 10 ? 'categoría 2: de 3 a 10 años' : 'categoría 3: más de 10 años'})`);
  if (antiguedadPorFechas && baseAguinaldoISO) {
    if (baseAguinaldoISO === fechaIngreso) {
      setTxt('m-agu-base', `desde la fecha de ingreso (${fmtDate(baseAguinaldoISO)}), por ser posterior al último 12 de diciembre`);
    } else {
      setTxt('m-agu-base', `desde el ${fmtDate(baseAguinaldoISO)} (presunción: fecha del último aguinaldo pagado)`);
    }
    setTxt('m-agu-detalle',
      `${detalleAguinaldo.meses} mes${detalleAguinaldo.meses === 1 ? '' : 'es'} y ${detalleAguinaldo.dias} día${detalleAguinaldo.dias === 1 ? '' : 's'} ` +
      `→ (${detalleAguinaldo.meses} × 30 + ${detalleAguinaldo.dias}) ÷ 360`);
  } else {
    setTxt('m-agu-base', 'no se especificaron ambas fechas → se aproxima con la fracción de antigüedad (completa las fechas para el cálculo exacto desde el 12 de diciembre)');
    setTxt('m-agu-detalle', `${meses} mes${meses === 1 ? '' : 'es'} → (${meses} × 30 + 0) ÷ 360`);
  }
  setTxt('m-agu-fraccion', fmtFrac(fraccionAguinaldo));
  setTxt('m-agu-fraccion2', fmtFrac(fraccionAguinaldo));
  setTxt('m-agu-calc', `${fmt.format(SBD)} × ${diasAguinaldo}`);
  setTxt('m-agu', fmt.format(aguinaldoProporcional));

  // 6. Indemnización o prestación por renuncia
  setTxt('m-causa-nombre', etiquetaCausa);
  setTxt('m-causa-legal', legalCausa);
  let topeTxt;
  if (causa === 'despido') {
    topeTxt = `Tope legal (Art. 58 CT): 4 × salario mínimo = 4 × ${fmt.format(SALARIO_MINIMO_LEY)} = ${fmt.format(topeCausa)}. `;
    topeTxt += salario > topeCausa
      ? `El salario de ${fmt.format(salario)} lo supera → se usa capado en ${fmt.format(topeCausa)}.`
      : `El salario de ${fmt.format(salario)} no lo supera → se usa íntegro.`;
    setTxt('m-causa-requisito', '');
  } else {
    const reqTxt = `Requisito (Art. 2): mínimo 2 años de servicio continuo → la antigüedad total de ${fmtFrac(antiguedadTotal)} años ${antiguedadTotal < 2 ? 'NO lo cumple → la prestación es $0.00.' : 'lo cumple.'} `;
    setTxt('m-causa-requisito', reqTxt);
    if (antiguedadTotal < 2) {
      topeTxt = '';
    } else {
      topeTxt = `Tope legal (Art. 4): 2 × salario mínimo = 2 × ${fmt.format(SALARIO_MINIMO_LEY)} = ${fmt.format(topeCausa)}. `;
      topeTxt += salario > topeCausa
        ? `El salario de ${fmt.format(salario)} lo supera → se usa capado en ${fmt.format(topeCausa)}.`
        : `El salario de ${fmt.format(salario)} no lo supera → se usa íntegro.`;
    }
  }
  setTxt('m-causa-tope', topeTxt);
  if (causa === 'despido') {
    setTxt('m-causa-calc', `${fmt.format(baseAnualCausa)} × (${anios} + ${fmtFrac(fraccionAnio)})`);
  } else if (antiguedadTotal < 2) {
    setTxt('m-causa-calc', 'no aplica');
  } else {
    setTxt('m-causa-calc', `${fmt.format(baseAnualCausa)} × (${anios} + ${fmtFrac(fraccionAnio)})`);
  }
  setTxt('m-causa-monto', fmt.format(montoCausa));
  if (causa === 'despido') {
    setTxt('m-causa-minimo', aplicaMinimo
      ? ` Mínimo legal (Art. 58 CT): 15 días de SBD = ${fmt.format(minimoLegal)}; el cálculo directo era menor → se elevó al mínimo.`
      : ` Mínimo legal (Art. 58 CT): 15 días de SBD = ${fmt.format(minimoLegal)}; el resultado lo supera → no aplica el ajuste.`);
  } else {
    setTxt('m-causa-minimo', '');
  }

  // 7–10. Jornadas extraordinarias y días especiales
  setTxt('m-hed-calc', `${fmt.format(H)} × ${heDiurnas} × 2`);
  setTxt('m-hed', fmt.format(subtotalHeDiurnas));
  setTxt('m-hen-calc', `${fmt.format(H)} × ${heNocturnas} × 2 × 1.25`);
  setTxt('m-hen', fmt.format(subtotalHeNocturnas));
  setTxt('m-asu-calc', `${fmt.format(SBD)} × 2 × ${diasAsueto}`);
  setTxt('m-asu', fmt.format(montoAsueto));
  setTxt('m-des-calc', `${fmt.format(SBD)} × 1.5 × ${diasDescanso}`);
  setTxt('m-des', fmt.format(montoDescanso));

  // 11. Total
  setTxt('m-total', fmt.format(totalDevengado));

  // 12–16. Deducciones
  setTxt('m-exento', fmt.format(montoExento));
  setTxt('m-gravada', fmt.format(remuneracionGravada));
  setTxt('m-isss-base', fmt.format(baseISSS));
  setTxt('m-isss', fmt.format(cotizacionISSS));
  setTxt('m-afp-base', fmt.format(remuneracionGravada));
  setTxt('m-afp', fmt.format(cotizacionAFP));
  setTxt('m-isr-base', fmt.format(baseISR));
  setTxt('m-isr-tramo', textoTramoISR(baseISR));
  setTxt('m-isr', fmt.format(retencionISR));
  setTxt('m-neto-calc',
    `${fmt.format(totalDevengado)} − (${fmt.format(cotizacionISSS)} + ${fmt.format(cotizacionAFP)} + ${fmt.format(retencionISR)})`);
  setTxt('m-neto', fmt.format(montoNeto));

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('btn-print').addEventListener('click', () => window.print());

/**
 * Nota: las fórmulas de vacación, aguinaldo, indemnización/renuncia, horas
 * extras, asueto y descanso semanal (Bloque de prestaciones) son las del
 * Código de Trabajo de El Salvador y de la Ley Reguladora de la Prestación
 * Económica por Renuncia Voluntaria (Decreto N.º 592, 2014).
 *
 * El aguinaldo proporcional se devenga desde el 12 de diciembre del último
 * pago (convención del caso guía de los Juzgados de lo Laboral: del
 * 12/12/2020 al 30/09/2021 = 9 meses y 19 días = 289 días).
 * La antigüedad incluye el último día laborado.
 * La tabla de ISR corresponde al Decreto Legislativo N.º 293 (abril 2025).
 */