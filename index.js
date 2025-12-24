const investmentAmountSlider = document.getElementById('investmentAmount');
const durationSlider = document.getElementById('duration');
const liquiditySlider = document.getElementById('liquidity');
const amountDisplay = document.getElementById('amountDisplay');
const durationDisplay = document.getElementById('durationDisplay');
const liquidityDisplay = document.getElementById('liquidityDisplay');
const calculateBtn = document.getElementById('calculateBtn');
const resultsSection = document.getElementById('resultsSection');

const fdRateInput = document.getElementById('fdRate');
const rdRateInput = document.getElementById('rdRate');
const sipRateInput = document.getElementById('sipRate');
const mfRateInput = document.getElementById('mfRate');

// Investment type colors
const COLORS = {
    fd: '#01B695',   // Green
    rd: '#82A1FD',   // Blue
    sip: '#EEB3E7',  // Pink
    mf: '#F59E0B'    // Yellow
};

// Investment type names
const NAMES = {
    fd: 'Fixed Deposit',
    rd: 'Recurring Deposit',
    sip: 'SIP',
    mf: 'Mutual Funds'
};


function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatCompactCurrency(amount) {
    if (amount >= 10000000) {
        return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    } else if (amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(2) + ' L';
    } else if (amount >= 1000) {
        return '₹' + (amount / 1000).toFixed(1) + 'K';
    }
    return formatCurrency(amount);
}

function getLiquidityLabel(value) {
    if (value <= 2) return `${value} - Very Low`;
    if (value <= 4) return `${value} - Low`;
    if (value <= 6) return `${value} - Balanced`;
    if (value <= 8) return `${value} - High`;
    return `${value} - Very High`;
}


// function getAllocation(liquidityFactor) {

//     const l = liquidityFactor;

//     const t = (l - 1) / 9; 

//     const lowAllocation = { fd: 40, rd: 30, sip: 20, mf: 10 };
//     const highAllocation = { fd: 10, rd: 15, sip: 40, mf: 35 };

    
//     return {
//         fd: Math.round(lowAllocation.fd + t * (highAllocation.fd - lowAllocation.fd)),
//         rd: Math.round(lowAllocation.rd + t * (highAllocation.rd - lowAllocation.rd)),
//         sip: Math.round(lowAllocation.sip + t * (highAllocation.sip - lowAllocation.sip)),
//         mf: Math.round(lowAllocation.mf + t * (highAllocation.mf - lowAllocation.mf))
//     };
// }

function getAllocation(liquidityFactor) {
    const l = Math.min(Math.max(liquidityFactor, 1), 10); // clamp 1–10
    const t = (l - 1) / 9;

    const lowAllocation = { fd: 40, rd: 30, sip: 20, mf: 10 };
    const highAllocation = { fd: 10, rd: 15, sip: 40, mf: 35 };

    // Step 1: calculate raw (floating point) values
    const raw = {};
    for (const key in lowAllocation) {
        raw[key] =
            lowAllocation[key] +
            t * (highAllocation[key] - lowAllocation[key]);
    }

    // Step 2: floor values and track remainders
    const result = {};
    const remainders = [];
    let total = 0;

    for (const key in raw) {
        result[key] = Math.floor(raw[key]);
        total += result[key];
        remainders.push({
            key,
            remainder: raw[key] - result[key]
        });
    }

    // Step 3: distribute remaining points
    let remaining = 100 - total;

    remainders
        .sort((a, b) => b.remainder - a.remainder)
        .forEach(item => {
            if (remaining > 0) {
                result[item.key]++;
                remaining--;
            }
        });

    return result;
}

function calculateFD(principal, annualRate, years) {
    const r = annualRate / 100;
    const n = 4; 
    const amount = principal * Math.pow(1 + r / n, n * years);
    return {
        invested: principal,
        returns: amount - principal,
        total: amount
    };
}


function calculateRD(monthlyDeposit, annualRate, years) {
    const r = annualRate / 100;
    const n = 12; 
    const months = years * 12;

    const ratePerPeriod = r / n;
    const amount = monthlyDeposit * ((Math.pow(1 + ratePerPeriod, months) - 1) / ratePerPeriod) * (1 + ratePerPeriod);
    const invested = monthlyDeposit * months;

    return {
        invested: invested,
        returns: amount - invested,
        total: amount
    };
}


function calculateSIP(monthlyAmount, annualRate, years) {
    const r = annualRate / 100;
    const months = years * 12;
    const monthlyRate = r / 12;

    const amount = monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const invested = monthlyAmount * months;

    return {
        invested: invested,
        returns: amount - invested,
        total: amount
    };
}


function calculateMutualFunds(principal, annualRate, years) {
    const r = annualRate / 100;
    const amount = principal * Math.pow(1 + r, years);
    return {
        invested: principal,
        returns: amount - principal,
        total: amount
    };
}


function updateSliderDisplays() {
    const amount = parseInt(investmentAmountSlider.value);
    const duration = parseInt(durationSlider.value);
    const liquidity = parseInt(liquiditySlider.value);

    amountDisplay.textContent = formatCompactCurrency(amount);
    durationDisplay.textContent = `${duration} Year${duration > 1 ? 's' : ''}`;
    liquidityDisplay.textContent = getLiquidityLabel(liquidity);

    updateSliderTrack(investmentAmountSlider);
    updateSliderTrack(durationSlider);
    updateSliderTrack(liquiditySlider);
}

function updateSliderTrack(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(to right, #8B5CF6 0%, #06B6D4 ${percentage}%, #12121a ${percentage}%)`;
}

function createPieChart(allocation) {
    const pieChart = document.getElementById('pieChart');
    const chartLegend = document.getElementById('chartLegend');

    pieChart.innerHTML = '<div class="pie-center"><span class="pie-label">Allocation</span></div>';
    chartLegend.innerHTML = '';

    let gradientStops = [];
    let currentAngle = 0;

    const types = ['fd', 'rd', 'sip', 'mf'];

    types.forEach(type => {
        const percent = allocation[type];
        if (percent > 0) {
            const startAngle = currentAngle;
            const endAngle = currentAngle + (percent * 3.6); // 360 * (percent/100)

            gradientStops.push(`${COLORS[type]} ${startAngle}deg ${endAngle}deg`);
            currentAngle = endAngle;

            // Add legend item
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background: ${COLORS[type]}"></div>
                <div class="legend-text">
                    <span class="legend-name">${NAMES[type]}</span>
                    <span class="legend-percent">${percent}%</span>
                </div>
            `;
            chartLegend.appendChild(legendItem);
        }
    });

    pieChart.style.background = `conic-gradient(${gradientStops.join(', ')})`;
}

function createInvestmentCards(results) {
    const container = document.getElementById('investmentCards');
    container.innerHTML = '';

    const types = ['fd', 'rd', 'sip', 'mf'];

    types.forEach(type => {
        const data = results[type];
        if (data.invested > 0) {
            const percentageReturn = ((data.returns / data.invested) * 100).toFixed(1);

            const card = document.createElement('div');
            card.className = `investment-card glass-card ${type}`;
            card.innerHTML = `
                <div class="card-header">
                    <h4 class="card-title">${NAMES[type]}</h4>
                    <span class="card-badge">${type === 'sip' || type === 'rd' ? 'Monthly' : 'Lump Sum'}</span>
                </div>
                <div class="card-stats">
                    <div class="stat">
                        <span class="stat-label">Invested</span>
                        <span class="stat-value">${formatCompactCurrency(data.invested)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Returns</span>
                        <span class="stat-value positive">+${formatCompactCurrency(data.returns)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Total Value</span>
                        <span class="stat-value">${formatCompactCurrency(data.total)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Growth</span>
                        <span class="stat-value positive">+${percentageReturn}%</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    });
}

function updateSummary(results) {
    let totalInvested = 0;
    let totalReturns = 0;
    let totalValue = 0;

    Object.values(results).forEach(data => {
        totalInvested += data.invested;
        totalReturns += data.returns;
        totalValue += data.total;
    });

    document.getElementById('totalInvestment').textContent = formatCompactCurrency(totalInvested);
    document.getElementById('totalReturns').textContent = formatCompactCurrency(totalReturns);
    document.getElementById('totalValue').textContent = formatCompactCurrency(totalValue);
}

function calculate() {
    const totalAmount = parseInt(investmentAmountSlider.value);
    const years = parseInt(durationSlider.value);
    const liquidity = parseInt(liquiditySlider.value);

    const fdRate = parseFloat(fdRateInput.value);
    const rdRate = parseFloat(rdRateInput.value);
    const sipRate = parseFloat(sipRateInput.value);
    const mfRate = parseFloat(mfRateInput.value);


    const allocation = getAllocation(liquidity);

    const fdAmount = (allocation.fd / 100) * totalAmount;
    const rdMonthly = ((allocation.rd / 100) * totalAmount) / (years * 12);
    const sipMonthly = ((allocation.sip / 100) * totalAmount) / (years * 12);
    const mfAmount = (allocation.mf / 100) * totalAmount;

    const results = {
        fd: calculateFD(fdAmount, fdRate, years),
        rd: calculateRD(rdMonthly, rdRate, years),
        sip: calculateSIP(sipMonthly, sipRate, years),
        mf: calculateMutualFunds(mfAmount, mfRate, years)
    };


    createPieChart(allocation);
    createInvestmentCards(results);
    updateSummary(results);

    resultsSection.classList.add('visible');

    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

investmentAmountSlider.addEventListener('input', updateSliderDisplays);
durationSlider.addEventListener('input', updateSliderDisplays);
liquiditySlider.addEventListener('input', updateSliderDisplays);


calculateBtn.addEventListener('click', calculate);


document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        calculate();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    updateSliderDisplays();
});
