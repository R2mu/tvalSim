// week12.js

// Utility function to update the output elements for sliders
const updateOutput = (sliderId, outputId) => {
    const slider = d3.select(`#${sliderId}`);
    const output = d3.select(`#${outputId}`);
    output.html(slider.property('value'));

    slider.on('input', () => {
        output.html(slider.property('value'));
        if (!simulationRunning) {
            updateData();
            updateSlopeChart();
            updateScatterPlot();
        }
    });
};

// Trigger the 'input' event for each slider to update the initial text
const triggerInputEvent = (sliderId) => {
    const slider = d3.select(`#${sliderId}`);
    slider.dispatch('input');
};

// Initialize sliders
triggerInputEvent('participants');
triggerInputEvent('mean-pre');
triggerInputEvent('mean-change');
triggerInputEvent('pre-std-dev');
triggerInputEvent('rho');

// Update the output elements for each slider
updateOutput('participants', 'participants-output');
updateOutput('mean-pre', 'mean-pre-output');
updateOutput('mean-change', 'mean-change-output');
updateOutput('pre-std-dev', 'pre-std-dev-output');
updateOutput('rho', 'rho-output');

// Set up chart dimensions and margins
const slopeChartSvg = d3.select('#slope-chart svg');
const slopeChartWidth = d3.select('#slope-chart').node().clientWidth;
const slopeChartHeight = parseFloat(slopeChartSvg.attr('height'));
const slopeChartMargin = { top: 60, right: 10, bottom: 20, left: 40 };
const slopeChartInnerWidth = slopeChartWidth - slopeChartMargin.left - slopeChartMargin.right;
const slopeChartInnerHeight = slopeChartHeight - slopeChartMargin.top - slopeChartMargin.bottom;

const meanDiffChartSvg = d3.select('#mean-difference-chart svg');
const meanDiffChartWidth = d3.select('#mean-difference-chart').node().clientWidth;
const meanDiffChartHeight = parseFloat(meanDiffChartSvg.attr('height'));
const meanDiffChartMargin = { top: 5, right: 100, bottom: 70, left: 10 };
const meanDiffChartInnerWidth = meanDiffChartWidth - meanDiffChartMargin.left - meanDiffChartMargin.right;
const meanDiffChartInnerHeight = meanDiffChartHeight - meanDiffChartMargin.top - meanDiffChartMargin.bottom;

let scatterContainer = d3.select('#scatter-plot');
let scatterWidth = scatterContainer.node().getBoundingClientRect().width;
let scatterHeight = scatterContainer.node().getBoundingClientRect().height;
let scatterMargin = { top: 40, right: 20, bottom: 60, left: 45 };
let scatterInnerWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
let scatterInnerHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;

let scatterSvg = scatterContainer.select('svg')
    .attr('width', scatterWidth)
    .attr('height', scatterHeight);

let scatterG = scatterSvg.append('g')
    .attr('transform', `translate(${scatterMargin.left},${scatterMargin.top})`);

let scatterXScale = d3.scaleLinear().range([0, scatterInnerWidth]);
let scatterYScale = d3.scaleLinear().range([scatterInnerHeight, 0]);
let scatterXAxis = d3.axisBottom(scatterXScale);
let scatterYAxis = d3.axisLeft(scatterYScale);

scatterG.append('g').attr('class', 'x axis').attr('transform', `translate(0,${scatterInnerHeight})`).call(scatterXAxis);
scatterG.append('g').attr('class', 'y axis').call(scatterYAxis);

const slopeChartG = slopeChartSvg.append('g').attr('transform', `translate(${slopeChartMargin.left},${slopeChartMargin.top})`);
const meanDiffChartG = meanDiffChartSvg.append('g').attr('transform', `translate(${meanDiffChartMargin.left},${meanDiffChartMargin.top})`);

const slopeChartXScale = d3.scaleBand().domain(['Pre', 'Post']).range([0, slopeChartInnerWidth + 45]);
const slopeChartYScale = d3.scaleLinear().domain([25, 75]).range([slopeChartInnerHeight, 0]);
let meanDiffChartYScale = d3.scaleLinear().range([meanDiffChartInnerHeight, 0]);

const slopeChartXAxis = d3.axisBottom(slopeChartXScale);
const slopeChartYAxis = d3.axisLeft(slopeChartYScale);
slopeChartG.append('g').attr('transform', `translate(0,${slopeChartInnerHeight})`).call(slopeChartXAxis);
slopeChartG.append('g').call(slopeChartYAxis);

let meanDiffChartYAxisG = meanDiffChartG.append("g").attr("class", "y-axis mean-diff-y-axis");
let meanDiffChartZeroLine = meanDiffChartG.append('line').attr('class', 'zero-line mean-diff-zero-line');


function generatePairedData(n, meanPre, preStdDev, meanChange, rho) {
    const data = [];
    const z1Gen = d3.randomNormal(0, 1);
    const z2Gen = d3.randomNormal(0, 1);
    const sqrt1MinusRhoSquared = Math.sqrt(1 - rho * rho);
    for (let i = 0; i < n; i++) {
        const e1 = z1Gen();
        const e2 = z2Gen();
        const e3 = (e1 * rho + e2 * sqrt1MinusRhoSquared);
        const pre = meanPre + preStdDev * e1;
        const post = meanPre + meanChange + preStdDev * e3;
        data.push({ pre, post });
    }
    return data;
}

let globalData;
function updateData() {
    const n = parseInt(d3.select('#participants').property('value'));
    const meanPre = parseFloat(d3.select('#mean-pre').property('value'));
    const preStdDev = parseFloat(d3.select('#pre-std-dev').property('value'));
    const meanChange = parseFloat(d3.select('#mean-change').property('value'));
    const rho = parseFloat(d3.select('#rho').property('value'));
    globalData = generatePairedData(n, meanPre, preStdDev, meanChange, rho);
}
updateData();

function standardDeviation(values) {
    if (!values || values.length === 0) return 0;
    const mean = d3.mean(values);
    const variance = d3.mean(values.map(value => Math.pow(value - mean, 2)));
    return Math.sqrt(variance);
}

const md_dist = [];
const tval_dist = [];
const pval_dist = [];
const cd_dist = [];
const sd_diff_dist = [];

let mdCounts = {}, tvalCounts = {}, pvalCounts = {}, cdCounts = {};
function resetCounts() { mdCounts = {}; tvalCounts = {}; pvalCounts = {}; cdCounts = {}; }

function getRoundedValueForKey(value, valueType) {
    switch (valueType) {
        case 'mean_diff': return parseFloat(value.toFixed(1));
        case 't_value':   return parseFloat(value.toFixed(1));
        case 'p_value':   return parseFloat(value.toFixed(2));
        case 'cohens_d':  return parseFloat(value.toFixed(1));
        default: return value;
    }
}

function updateCounts(originalValue, valueType) {
    const key = getRoundedValueForKey(originalValue, valueType);
    let countsMap;
    switch (valueType) {
        case 'mean_diff': countsMap = mdCounts; break;
        case 't_value':   countsMap = tvalCounts; break;
        case 'p_value':   countsMap = pvalCounts; break;
        case 'cohens_d':  countsMap = cdCounts; break;
        default: return;
    }
    if (countsMap[key] === undefined) countsMap[key] = 0;
    countsMap[key]++;
}

function getCircleCount(originalValue, valueType) {
    const key = getRoundedValueForKey(originalValue, valueType);
    switch (valueType) {
        case 'mean_diff': return mdCounts[key] || 0;
        case 't_value':   return tvalCounts[key] || 0;
        case 'p_value':   return pvalCounts[key] || 0;
        case 'cohens_d':  return cdCounts[key] || 0;
        default: return 0;
    }
}

function getSelectedRadioButtonValue(name) {
    const radio = d3.select(`input[name="${name}"]:checked`);
    return radio.empty() ? null : radio.property('value');
}

function updateMeanDiffChartAxesAndOverallStats() {
    const selectedRadioValue = getSelectedRadioButtonValue("analysis_type");
    let yDomain;
    switch (selectedRadioValue) {
        case "mean_diff": yDomain = [-10, 10]; break;
        case "t_value":   yDomain = [-4, 4];   break;
        case "p_value":   yDomain = [0, 1];    break;
        case "cohens_d":  yDomain = [-3, 3];   break;
        default:          yDomain = [-10, 10];
    }
    meanDiffChartYScale.domain(yDomain);

    const MeanChartYAxis = d3.axisRight(meanDiffChartYScale);
    meanDiffChartYAxisG.call(MeanChartYAxis).attr("transform", `translate(${meanDiffChartInnerWidth},0)`);

    meanDiffChartZeroLine
        .attr('x1', 0)
        .attr('y1', meanDiffChartYScale(0))
        .attr('x2', meanDiffChartInnerWidth)
        .attr('y2', meanDiffChartYScale(0))
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');

    meanDiffChartG.selectAll(".overall-mu-circle").remove();
    meanDiffChartG.selectAll(".overall-mu-ci-line").remove();

    if (md_dist.length > 0) {
        let dataForOverallStats;
        switch (selectedRadioValue) {
            case "mean_diff": dataForOverallStats = md_dist; break;
            case "t_value":   dataForOverallStats = tval_dist; break;
            case "p_value":   dataForOverallStats = pval_dist; break;
            case "cohens_d":  dataForOverallStats = cd_dist; break;
            default: return;
        }

        let overallMean = d3.mean(dataForOverallStats);
        let lcl = jStat.percentile(dataForOverallStats, 0.025);
        let ucl = jStat.percentile(dataForOverallStats, 0.975);

        if (isFinite(overallMean)) {
            meanDiffChartG.append('circle')
                .attr('class', 'overall-mu-circle')
                .attr('r', 4)
                .attr('fill', "purple")
                .attr('cx', meanDiffChartInnerWidth + 40)
                .attr('cy', meanDiffChartYScale(overallMean));
        }
        if (isFinite(lcl) && isFinite(ucl)) {
            meanDiffChartG.append('line')
                .attr('class', 'overall-mu-ci-line')
                .attr('x1', meanDiffChartInnerWidth + 40)
                .attr('x2', meanDiffChartInnerWidth + 40)
                .attr('y1', meanDiffChartYScale(lcl))
                .attr('y2', meanDiffChartYScale(ucl))
                .attr('stroke', 'purple')
                .attr('stroke-width', 2);
        }
    }
    // Log stats whenever axes/overall stats are updated (e.g. N changes)
    logSimulationStats();
}


function animateNewMeanDifferencePoint(simMeanDiff, simTval, simPval, simCd, simStdDevDiff) {
    updateMeanDiffChartAxesAndOverallStats(); // This will also call logSimulationStats

    const selectedRadioValue = getSelectedRadioButtonValue("analysis_type");
    const n_participants = parseInt(d3.select('#participants').property('value'));
    const xOffset = 10;

    let yValueForPlot;
    let valueForCountMap;

    switch (selectedRadioValue) {
        case "mean_diff": yValueForPlot = simMeanDiff; valueForCountMap = simMeanDiff; break;
        case "t_value":   yValueForPlot = simTval;   valueForCountMap = simTval;   break;
        case "p_value":   yValueForPlot = simPval;   valueForCountMap = simPval;   break;
        case "cohens_d":  yValueForPlot = simCd;     valueForCountMap = simCd;     break;
        default:          yValueForPlot = 0;         valueForCountMap = 0;
    }

    updateCounts(valueForCountMap, selectedRadioValue);
    const finalCx = meanDiffChartInnerWidth - (getCircleCount(valueForCountMap, selectedRadioValue) * xOffset);
    const circleColor = (simPval <= 0.05 ? "yellow" : "gray");

    const initialCxForAnimation = 0;
    const dotPlotCy = meanDiffChartYScale(yValueForPlot);

    const newCircle = meanDiffChartG.append('circle')
        .attr('class', 'mean-difference-circle animated-dot')
        .attr('r', 5)
        .attr('fill', circleColor)
        .attr('cx', initialCxForAnimation)
        .attr('cy', dotPlotCy);

    newCircle.transition("slide")
        .duration(1500)
        .ease(d3.easeCubicInOut)
        .attr('cx', finalCx)
        .attr('r', 3);

    if (selectedRadioValue === "mean_diff" && n_participants > 1 && simStdDevDiff > 0) {
        const dof_single_sim = n_participants - 1;
        if (dof_single_sim > 0) {
            const critVal_single_sim = jStat.studentt.inv(1 - 0.05 / 2, dof_single_sim);
            const sem_single_sim = simStdDevDiff / Math.sqrt(n_participants);
            const moe_single_sim = critVal_single_sim * sem_single_sim;

            if (isFinite(moe_single_sim) && moe_single_sim > 0) {
                const ciBarScreenLength = Math.abs(meanDiffChartYScale(yValueForPlot) - meanDiffChartYScale(yValueForPlot - moe_single_sim));
                const tempErrorBar = meanDiffChartG.append('line')
                    .attr('class', 'error-bar temp-error-bar')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1)
                    .attr('x1', initialCxForAnimation)
                    .attr('x2', initialCxForAnimation)
                    .attr('y1', dotPlotCy - ciBarScreenLength)
                    .attr('y2', dotPlotCy + ciBarScreenLength);

                tempErrorBar.transition("slide")
                    .duration(1500)
                    .ease(d3.easeCubicInOut)
                    .attr('x1', finalCx)
                    .attr('x2', finalCx)
                    .remove();
            }
        }
    }
    // Log the statistical counters after processing the new point
    logSimulationStats();
}

// MODIFIED FUNCTION to log simulation statistics to the console
function logSimulationStats() {
    const n_participants = parseInt(d3.select('#participants').property('value'));
    const totalSimulations = tval_dist.length; // Assuming tval_dist has one entry per sim

    // console.clear(); // Optional: Clears console before new logs for less clutter
    console.log("--- Simulation Stats ---");
    console.log(`Total Simulations: ${totalSimulations}`);

    if (totalSimulations === 0 || n_participants <= 1) {
        console.log("Simulations with |t| > t_crit: 0");
        console.log("Proportion Significant: 0.0000");
        console.log("------------------------");
        return;
    }

    const alpha = 0.05;
    const dof = n_participants - 1;
    const criticalTValue = jStat.studentt.inv(1 - alpha / 2, dof); // For two-tailed test

    let significantTCount = 0;
    tval_dist.forEach(tVal => {
        if (Math.abs(tVal) > criticalTValue) {
            significantTCount++;
        }
    });

    const proportionSignificant = totalSimulations > 0 ? (significantTCount / totalSimulations) : 0;

    console.log(`Critical t-value (df=${dof}, alpha=0.05, two-tailed): ${criticalTValue.toFixed(3)}`);
    console.log(`Simulations with |t| > t_crit: ${significantTCount}`);
    console.log(`Proportion Significant (|t| > t_crit): ${proportionSignificant.toFixed(4)}`);
    console.log("------------------------");
}


function redrawMeanDifferenceChart() {
    meanDiffChartG.selectAll(".mean-difference-circle").remove();
    meanDiffChartG.selectAll(".error-bar:not(.temp-error-bar)").remove();

    updateMeanDiffChartAxesAndOverallStats(); // This will also call logSimulationStats
    resetCounts();

    const selectedRadioValue = getSelectedRadioButtonValue("analysis_type");
    const xOffset = 10;

    if (md_dist.length === 0) return;

    for (let i = 0; i < md_dist.length; i++) {
        const simMeanDiff = md_dist[i];
        const simTval = tval_dist[i];
        const simPval = pval_dist[i];
        const simCd = cd_dist[i];

        let yValueForPlot;
        let valueForCountMap;

        switch (selectedRadioValue) {
            case "mean_diff": yValueForPlot = simMeanDiff; valueForCountMap = simMeanDiff; break;
            case "t_value":   yValueForPlot = simTval;   valueForCountMap = simTval;   break;
            case "p_value":   yValueForPlot = simPval;   valueForCountMap = simPval;   break;
            case "cohens_d":  yValueForPlot = simCd;     valueForCountMap = simCd;     break;
            default: yValueForPlot = 0; valueForCountMap = 0;
        }

        updateCounts(valueForCountMap, selectedRadioValue);
        const cxPos = meanDiffChartInnerWidth - (getCircleCount(valueForCountMap, selectedRadioValue) * xOffset);
        let circleColor = (simPval <= 0.05 ? "yellow" : "gray");

        meanDiffChartG.append('circle')
            .attr('class', 'mean-difference-circle static-dot')
            .attr('r', 3)
            .attr('fill', circleColor)
            .attr('cx', cxPos)
            .attr('cy', meanDiffChartYScale(yValueForPlot));
    }
    // Log stats after redrawing too, in case N changed or radio button toggled
    logSimulationStats();
}

function updateVisualizedResults() {
    meanDiffChartG.selectAll(".mean-difference-circle").remove();
    meanDiffChartG.selectAll(".error-bar:not(.temp-error-bar)").remove();
    redrawMeanDifferenceChart(); // This will call logSimulationStats
}

d3.selectAll('input[name="analysis_type"]').on('change', updateVisualizedResults);


scatterG.append("text")
    .attr("transform", `translate(${scatterInnerWidth / 2} ,${scatterInnerHeight + scatterMargin.top + 10})`)
    .style("text-anchor", "middle")
    .text("Pre");

scatterG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - scatterMargin.left)
    .attr("x", 0 - (scatterInnerHeight / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Post");

function updateScatterPlot() {
    let data = globalData;
    if (!data || data.length === 0) {
        scatterG.selectAll('circle.scatter-point').remove();
        return;
    }

    const preExtent = d3.extent(data, d => d.pre);
    const postExtent = d3.extent(data, d => d.post);
    const xDomain = [Math.min(25, preExtent[0] || 25), Math.max(70, preExtent[1] || 70)];
    const yDomain = [Math.min(25, postExtent[0] || 25), Math.max(70, postExtent[1] || 70)];

    scatterXScale.domain(xDomain);
    scatterYScale.domain(yDomain);

    scatterG.select('.x.axis').call(scatterXAxis);
    scatterG.select('.y.axis').call(scatterYAxis);

    let circles = scatterG.selectAll('circle.scatter-point')
        .data(data);

    circles.enter().append('circle')
        .attr('class', 'scatter-point')
        .attr('r', 4)
        .attr('fill', 'steelblue')
        .merge(circles)
        .attr('cx', d => scatterXScale(d.pre))
        .attr('cy', d => scatterYScale(d.post));

    circles.exit().remove();
}
updateScatterPlot();


function updateSlopeChart() {
    const preMeanSliderValue = parseFloat(d3.select('#mean-pre').property('value'));
    const preStdDevSliderValue = parseFloat(d3.select('#pre-std-dev').property('value'));

    slopeChartG.selectAll('.pre-mean-line')
        .data([{ mean: preMeanSliderValue }])
        .join(
            enter => enter.append('line').attr('class', 'pre-mean-line').attr('stroke', 'red').attr('stroke-width', 2),
            update => update
        )
        .attr('x1', 0)
        .attr('y1', d => slopeChartYScale(d.mean))
        .attr('x2', 50)
        .attr('y2', d => slopeChartYScale(d.mean));

    const mean = preMeanSliderValue;
    const stdDev = preStdDevSliderValue;
    const xValues = d3.range(-3, 3.1, 0.1);
    const datum = xValues.map(x => ({
        x: x * stdDev + mean,
        y: jStat.normal.pdf(x * stdDev, 0, stdDev)
    }));

    const line = d3.line()
        .x(d => slopeChartXScale('Pre') + 47 + d.y * -550)
        .y(d => slopeChartYScale(d.x))
        .curve(d3.curveBasis);

    slopeChartG.selectAll('.pdf-line').data([datum])
        .join(
            enter => enter.append('path').attr('class', 'pdf-line').attr('fill', 'gray').attr('fill-opacity', .3).attr('stroke', 'black').attr('stroke-width', 2),
            update => update
        )
        .attr('d', line);

    const n = parseInt(d3.select('#participants').property('value'));
    let data = globalData;
    if (!data) return;

    slopeChartG.selectAll('.slope-line').data(data)
        .join(
            enter => enter.append('line').attr('class', 'slope-line').attr('stroke', 'steelblue').attr('opacity', 0.5).attr('stroke-width', 1),
            update => update
        )
        .attr('x1', slopeChartXScale('Pre') + 110)
        .attr('y1', d => slopeChartYScale(d.pre))
        .attr('x2', slopeChartXScale('Post') + 40)
        .attr('y2', d => slopeChartYScale(d.post));

    slopeChartG.selectAll('.pre-circle').data(data)
        .join(
            enter => enter.append('circle').attr('class', 'pre-circle').attr('fill', 'white').attr("stroke", "steelblue").attr("stroke-width", 1.5).attr('r', 3).attr('cx', slopeChartXScale('Pre') + 110),
            update => update
        )
        .attr('cy', d => slopeChartYScale(d.pre));

    slopeChartG.selectAll('.post-circle').data(data)
        .join(
            enter => enter.append('circle').attr('class', 'post-circle').attr('fill', 'white').attr("stroke", "steelblue").attr("stroke-width", 1.5).attr('r', 3).attr('cx', slopeChartXScale('Post') + 40),
            update => update
        )
        .attr('cy', d => slopeChartYScale(d.post));

    const meanPreValues = d3.mean(data, d => d.pre);
    const meanPostValues = d3.mean(data, d => d.post);
    const preStdDevValues = standardDeviation(data.map(d => d.pre));
    const postStdDevValues = standardDeviation(data.map(d => d.post));

    const errorBarDataSlope = [
        { mean: meanPreValues, stdDev: preStdDevValues, x: slopeChartXScale('Pre') + 80 },
        { mean: meanPostValues, stdDev: postStdDevValues, x: slopeChartXScale('Post') + 70 }
    ];

    slopeChartG.selectAll('.error-bar.slope-chart-ebar')
        .data(errorBarDataSlope)
        .join(
            enter => enter.append('line').attr('class', 'error-bar slope-chart-ebar').attr('stroke', 'gray').attr('stroke-width', 1),
            update => update
        )
        .attr('x1', d => d.x)
        .attr('x2', d => d.x)
        .attr('y1', d => slopeChartYScale(d.mean - d.stdDev))
        .attr('y2', d => slopeChartYScale(d.mean + d.stdDev));


    const meanCirclesData = [
        { cx: slopeChartXScale('Pre') + 80, cy: slopeChartYScale(meanPreValues), classSuffix: 'preMu-circle' },
        { cx: slopeChartXScale('Post') + 70, cy: slopeChartYScale(meanPostValues), classSuffix: 'pstMu-circle' }
    ];
    slopeChartG.selectAll('.slope-mean-circle').data(meanCirclesData)
        .join(
            enter => enter.append('circle').attr('fill', 'white').attr("stroke", "black").attr("stroke-width", 1.5).attr('r', 5),
            update => update
        )
        .attr('class', d => `slope-mean-circle ${d.classSuffix}`)
        .attr('cx', d => d.cx)
        .attr('cy', d => d.cy);

    const differences = data.map(d => d.post - d.pre);
    const currentMeanDifference = d3.mean(differences);
    const currentStdDevDifference = standardDeviation(differences);

    const currentTval = (n > 1 && currentStdDevDifference > 0) ? (currentMeanDifference / (currentStdDevDifference / Math.sqrt(n))) : 0;
    const pooledStdDev = (preStdDevValues + postStdDevValues) / 2;
    const currentCd = pooledStdDev > 0 ? (currentMeanDifference / pooledStdDev) : 0;

    const dfm1 = n > 1 ? n - 1 : 1;
    let p_one_tailed = 0.5;
    if (n > 1 && currentStdDevDifference > 0) {
      p_one_tailed = 1 - jStat.studentt.cdf(Math.abs(currentTval), dfm1);
    }
    const currentPval = p_one_tailed * 2;

    md_dist.push(currentMeanDifference);
    tval_dist.push(currentTval);
    pval_dist.push(currentPval);
    cd_dist.push(currentCd);
    sd_diff_dist.push(currentStdDevDifference);

    animateNewMeanDifferencePoint(currentMeanDifference, currentTval, currentPval, currentCd, currentStdDevDifference);
}

updateSlopeChart(); // This will call animateNewMeanDifferencePoint, which calls logSimulationStats


let simulationRunning = false;
let simulationInterval;

d3.select("#simulation-toggle").on("click", () => {
    simulationRunning = !simulationRunning;
    if (simulationRunning) {
        d3.select("#simulation-toggle").text("Stop Simulation");
        const updateSpeed = d3.select("#update-speed").node().value;
        meanDiffChartG.selectAll(".temp-error-bar").remove();
        meanDiffChartG.selectAll(".animated-dot").remove();

        simulationInterval = setInterval(() => {
            updateData();
            updateSlopeChart(); // This will call animate... -> logSimulationStats
            updateScatterPlot();
        }, updateSpeed);
    } else {
        d3.select("#simulation-toggle").text("Start Simulation");
        clearInterval(simulationInterval);
    }
});

updateVisualizedResults(); // This will call redrawMeanDifferenceChart -> logSimulationStats