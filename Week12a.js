// week12.js

// Utility function to update the output elements for sliders
const updateOutput = (sliderId, outputId) => {
    const slider = d3.select(`#${sliderId}`);
    const output = d3.select(`#${outputId}`);
    output.html(slider.property('value'));

    slider.on('input', () => {
        output.html(slider.property('value'));
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

// Create scales and axes for scatter plot
let scatterXScale = d3.scaleLinear()
    .domain([25, 70])
    .range([0, scatterInnerWidth]);

let scatterYScale = d3.scaleLinear()
    .domain([25, 70])
    .range([scatterInnerHeight, 0]);

let scatterXAxis = d3.axisBottom(scatterXScale);
let scatterYAxis = d3.axisLeft(scatterYScale);

scatterG.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${scatterInnerHeight})`)
    .call(scatterXAxis);

scatterG.append('g')
    .attr('class', 'y axis')
    .call(scatterYAxis);

// Create the main visualization group inside the SVG container
const slopeChartG = slopeChartSvg.append('g')
    .attr('transform', `translate(${slopeChartMargin.left},${slopeChartMargin.top})`);

const meanDiffChartG = meanDiffChartSvg.append('g')
    .attr('transform', `translate(${meanDiffChartMargin.left},${meanDiffChartMargin.top})`);

// Draw X and Y axis for slope chart
const slopeChartXScale = d3.scaleBand()
    .domain(['Pre', 'Post'])
    .range([0, slopeChartInnerWidth + 45]);

const slopeChartYScale = d3.scaleLinear()
    .domain([25, 75])
    .range([slopeChartInnerHeight, 0]);

let meanDiffChartYScale = d3.scaleLinear()
    .range([meanDiffChartInnerHeight, 0]);

const slopeChartXAxis = d3.axisBottom(slopeChartXScale);
const slopeChartYAxis = d3.axisLeft(slopeChartYScale);

slopeChartG.append('g')
    .attr('transform', `translate(0,${slopeChartInnerHeight})`)
    .call(slopeChartXAxis);

slopeChartG.append('g')
    .call(slopeChartYAxis);

let meanDiffChartYAxisG = meanDiffChartG.append("g")
    .attr("class", "y-axis");

// Function to generate paired response data
function generatePairedData(n, meanPre, preStdDev, meanChange, rho) {
    const data = [];
    const z1 = d3.randomNormal(0, 1);
    const z2 = d3.randomNormal(0, 1);
    const sqrt1MinusRhoSquared = Math.pow((1 - rho * rho), .5);

    for (let i = 0; i < n; i++) {
        const e1 = z1();
        const e2 = z2();
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
    const mean = d3.mean(values);
    const variance = d3.mean(values.map(value => Math.pow(value - mean, 2)));
    return Math.sqrt(variance);
}

// Create an array to store the count of circles at each y position
const cd_dist = [];
const tval_dist = [];
const pval_dist = [];
const md_dist = [];

let circleCounts = {};
let mdCounts = {};
let tvalCounts = {};
let pvalCounts = {};
let cdCounts = {};

function resetCounts() {
    circleCounts = {};
    mdCounts = {};
    tvalCounts = {};
    pvalCounts = {};
    cdCounts = {};
}

function updateCounts(value, valueType) {
    switch (valueType) {
        case 'mean_diff':
            if (mdCounts[value] === undefined) {
                mdCounts[value] = 1;
            } else {
                mdCounts[value]++;
            }
            break;
        case 't_value':
            if (tvalCounts[value] === undefined) {
                tvalCounts[value] = 1;
            } else {
                tvalCounts[value]++;
            }
            break;
        case 'p_value':
            if (pvalCounts[value] === undefined) {
                pvalCounts[value] = 1;
            } else {
                pvalCounts[value]++;
            }
            break;
        case 'cohens_d':
            if (cdCounts[value] === undefined) {
                cdCounts[value] = 1;
            } else {
                cdCounts[value]++;
            }
            break;
    }
}

function getCircleCount(value, valueType) {
    switch (valueType) {
        case 'mean_diff':
            return mdCounts[value];
        case 't_value':
            return tvalCounts[value];
        case 'p_value':
            return pvalCounts[value];
        case 'cohens_d':
            return cdCounts[value];
        default:
            return 0;
    }
}

let muCircle = null;
let muCI = null;

// Function to add mean difference circle
function addMeanDifferenceCircle(meanDifference, stdDevDifference, Tval, pval, cd, selectedRadioValue) {
    md_dist.push(meanDifference);
    tval_dist.push(Tval);
    pval_dist.push(pval);
    cd_dist.push(cd);

    let array_mu = d3.mean(md_dist);
    let array_sd = standardDeviation(md_dist);
    const n = parseInt(d3.select('#participants').property('value'));
    //const dof = n - 1;
    const dof = n;
    const quantile = 0.975;
    const criticalTValue = jStat.studentt.inv(quantile, dof);
    let alpha = 0.05;

    let critVal = jStat.studentt.inv(1 - alpha / 2, dof-1);
    let sem = array_sd / Math.sqrt(n);
    let moe = critVal * sem;
    let lcl = jStat.percentile(md_dist, 0.025);
    let ucl = jStat.percentile(md_dist, 0.975);
    let greaterThanCriticalT = tval_dist.filter(tval => tval > criticalTValue).length;
    let lessThanNegativeCriticalT = tval_dist.filter(tval => tval < -criticalTValue).length;
    let arrayLength = tval_dist.length;

    updateCounts(meanDifference, 'mean_diff');
    updateCounts(Tval, 't_value');
    updateCounts(pval, 'p_value');
    updateCounts(cd, 'cohens_d');

    let test = selectedRadioValue === 'mean_diff' ? meanDifference :
        selectedRadioValue === 't_value' ? Tval :
        selectedRadioValue === 'p_value' ? pval :
        selectedRadioValue === 'cohens_d' ? cd :
        0;

    console.log("Number of iterations:", arrayLength);
    console.log("Number of blue:", greaterThanCriticalT + lessThanNegativeCriticalT);
    console.log("%percentage blue:", Number((greaterThanCriticalT + lessThanNegativeCriticalT) / arrayLength).toFixed(4));

    const y = test;
    const xOffset = 10; // This value determines the horizontal distance between circles
    //stdDevDifference
    let errBar = selectedRadioValue !== "mean_diff" ? 0 : sem*critVal;

    let color = (pval <= 0.05 ? "yellow" : "gray");

    let yDomain;
    switch (selectedRadioValue) {
        case "mean_diff":
            yDomain = [-10, 10];
            break;
        case "t_value":
            yDomain = [-4, 4];
            break;
        case "p_value":
            yDomain = [0, 1];
            break;
        case "cohens_d":
            yDomain = [-3, 3];
            break;
        default:
            yDomain = [-10, 10];
    }

    meanDiffChartYScale.domain(yDomain);
    const MeanChartYAxis = d3.axisRight(meanDiffChartYScale);

    meanDiffChartYAxisG.remove();

    meanDiffChartYAxisG = meanDiffChartG.append("g")
        .attr("class", "y-axis")
        .call(MeanChartYAxis)
        .attr("transform", "translate(" + meanDiffChartInnerWidth + " ,0)");

    meanDiffChartG.append('line')
        .attr('x1', 0)
        .attr('y1', meanDiffChartYScale(0))
        .attr('x2', meanDiffChartInnerWidth)
        .attr('y2', meanDiffChartYScale(0))
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5');

    const newCircle = meanDiffChartG.append('circle')
        .attr('class', 'mean-difference-circle')
        .attr('r', 5)
        .attr('fill', color)
        .attr('cx', 0)
        .attr('cy', meanDiffChartYScale(y));

    newCircle.transition()
        .duration(1500)
        .attr('r', 3)
        .ease(d3.easePolyIn.exponent(3))
        .attr('cx', meanDiffChartInnerWidth - (getCircleCount(y, selectedRadioValue)) * xOffset);

    const errorBarG = meanDiffChartG.append('g')
        .attr('class', 'error-bar');

    errorBarG.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', meanDiffChartYScale(meanDifference - moe))
        .attr('y2', meanDiffChartYScale(meanDifference + moe))
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .transition()
        .duration(1500)
        .ease(d3.easePolyIn.exponent(3))
        .attr('x1', meanDiffChartInnerWidth - (getCircleCount(y, selectedRadioValue)) * xOffset)
        .attr('x2', meanDiffChartInnerWidth - (getCircleCount(y, selectedRadioValue)) * xOffset)
        .remove();

    if (muCircle) {
        muCircle.remove();
    }

    muCircle = meanDiffChartG.append('circle')
        .attr('class', 'mean-difference-circle')
        .attr('r', 4)
        .attr('fill', "purple")
        .attr('cx', meanDiffChartInnerWidth + 40)
        .attr('cy', meanDiffChartYScale(array_mu));

    if (muCI) {
        muCI.remove();
    }

    muCI = meanDiffChartG.append('line')
        .attr('x1', meanDiffChartInnerWidth + 40)
        .attr('x2', meanDiffChartInnerWidth + 40)
        .attr('y1', meanDiffChartYScale(lcl))
        .attr('y2', meanDiffChartYScale(ucl))
        .attr('stroke', 'gray')
        .attr('stroke-width', 1);
}

// Function to update visualized results based on selected radio button
function updateVisualizedResults() {
    const selectedRadioValue = getSelectedRadioButtonValue("analysis_type");

    // Clear the current visualizations
    meanDiffChartG.selectAll(".mean-difference-circle").remove();
    meanDiffChartG.selectAll(".error-bar").remove();

    // Reset the counts
    resetCounts();

    // Re-draw the visualizations based on the selected radio button
    md_dist.forEach((meanDifference, index) => {
        const stdDevDifference = standardDeviation(md_dist);
        const Tval = tval_dist[index];
        const pval = pval_dist[index];
        const cd = cd_dist[index];
        addMeanDifferenceCircle(meanDifference, stdDevDifference, Tval, pval, cd, selectedRadioValue);
    });
}

// Add event listener to radio buttons
d3.selectAll('input[name="analysis_type"]').on('change', updateVisualizedResults);

scatterG.append("text")
    .attr("transform", `translate(${scatterInnerWidth / 2} ,${scatterInnerHeight + scatterMargin.top})`)
    .style("text-anchor", "middle")
    .text("Pre");

// Add y-axis label
scatterG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - scatterMargin.left)
    .attr("x", 0 - (scatterInnerHeight / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Post");

function updateScatterPlot() {
    let data = globalData;

    let circles = scatterG.selectAll('circle')
        .data(data);

    circles.enter().append('circle')
        .attr('r', 4)
        .attr('cx', d => scatterXScale(d.pre))
        .attr('cy', d => scatterYScale(d.post))
        .attr('fill', 'steelblue');

    circles.exit().remove();

    circles.transition()
        .duration(0)
        .attr('cx', d => scatterXScale(d.pre))
        .attr('cy', d => scatterYScale(d.post));
}

updateScatterPlot();

function getSelectedRadioButtonValue(name) {
    var radios = document.getElementsByName(name);

    for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return radios[i].value;
        }
    }

    return null;
}

function updateSlopeChart(useTValue) {
    const preMeanSliderValue = parseFloat(d3.select('#mean-pre').property('value'));
    const preStdDevSliderValue = parseFloat(d3.select('#pre-std-dev').property('value'));

    const preMeanLine = slopeChartG.selectAll('.pre-mean-line')
        .data([{ mean: preMeanSliderValue }]);

    preMeanLine.enter()
        .append('line')
        .attr('class', 'pre-mean-line')
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .merge(preMeanLine)
        .attr('x1', 0)
        .attr('y1', d => slopeChartYScale(d.mean))
        .attr('x2', 50)
        .attr('y2', d => slopeChartYScale(d.mean));

    preMeanLine.exit().remove();

    const mean = preMeanSliderValue;
    const stdDev = preStdDevSliderValue;
    const xValues = d3.range(-3, 3.1, 0.1);
    const datum = xValues.map(x => ({
        x: x * stdDev + mean,
        y: jStat.normal.pdf(x * stdDev + mean, mean, stdDev)
    }));

    const line = d3.line()
        .x(d => slopeChartXScale('Pre') + 47 + d.y * -550)
        .y(d => slopeChartYScale(d.x))
        .curve(d3.curveBasis);

    const pdfPath = slopeChartG.selectAll('.pdf-line').data([datum]);

    pdfPath.enter().append('path')
        .attr('class', 'pdf-line')
        .attr('fill', 'gray')
        .attr('fill-opacity', .3)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .merge(pdfPath)
        .attr('d', line);

    pdfPath.exit().remove();

    const n = parseInt(d3.select('#participants').property('value'));
    let data = globalData;

    const lines = slopeChartG.selectAll('.slope-line')
        .data(data);

    lines.enter()
        .append('line')
        .attr('class', 'slope-line')
        .attr('stroke', 'steelblue')
        .attr('opacity', 0.5)
        .attr('stroke-width', 1)
        .merge(lines)
        .attr('x1', slopeChartXScale('Pre') + 110)
        .attr('y1', d => slopeChartYScale(d.pre))
        .attr('x2', slopeChartXScale('Post') + 40)
        .attr('y2', d => slopeChartYScale(d.post));

    lines.exit().remove();

    const preCircles = slopeChartG.selectAll('.pre-circle')
        .data(data);

    preCircles.enter()
        .append('circle')
        .attr('class', 'pre-circle')
        .attr('fill', 'white')
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr('r', 3)
        .attr('cx', slopeChartXScale('Pre') + 110)
        .merge(preCircles)
        .attr('cy', d => slopeChartYScale(d.pre));

    preCircles.exit().remove();

    const postCircles = slopeChartG.selectAll('.post-circle')
        .data(data);

    postCircles.enter()
        .append('circle')
        .attr('class', 'post-circle')
        .attr('fill', 'white')
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr('r', 3)
        .merge(postCircles)
        .attr('cx', slopeChartXScale('Post') + 40)
        .attr('cy', d => slopeChartYScale(d.post));

    postCircles.exit().remove();

    const meanPreValues = d3.mean(data, d => d.pre);
    const meanPostValues = d3.mean(data, d => d.post);
    const preStdDevValues = standardDeviation(data.map(d => d.pre));
    const postStdDevValues = standardDeviation(data.map(d => d.post));

    const errorBarData = [
        { mean: meanPreValues, stdDev: preStdDevValues, x: slopeChartXScale('Pre') + 80 },
        { mean: meanPostValues, stdDev: postStdDevValues, x: slopeChartXScale('Post') + 70 }
    ];

    const errorBars = slopeChartG.selectAll('.error-bar')
        .data(errorBarData);

    const errorBarEnter = errorBars.enter()
        .append('g')
        .attr('class', 'error-bar');

    errorBarEnter.append('line')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1);

    const errorBarUpdate = errorBars.merge(errorBarEnter);

    errorBarUpdate.select('line:nth-child(1)')
        .attr('x1', d => d.x)
        .attr('x2', d => d.x)
        .attr('y1', d => slopeChartYScale(d.mean - d.stdDev))
        .attr('y2', d => slopeChartYScale(d.mean + d.stdDev));

    errorBars.exit().remove();

    const preMuCircles = slopeChartG.selectAll('.preMu-circle')
        .data(data);

    preMuCircles.enter()
        .append('circle')
        .attr('class', 'preMu-circle')
        .attr('fill', 'white')
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr('r', 5)
        .merge(preMuCircles)
        .attr('cx', slopeChartXScale('Pre') + 80)
        .attr('cy', slopeChartYScale(meanPreValues));

    preMuCircles.exit().remove();

    const pstMuCircles = slopeChartG.selectAll('.pstMu-circle')
        .data(data);

    pstMuCircles.enter()
        .append('circle')
        .attr('class', 'pstMu-circle')
        .attr('fill', 'white')
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr('r', 5)
        .merge(pstMuCircles)
        .attr('cx', slopeChartXScale('Post') + 70)
        .attr('cy', slopeChartYScale(meanPostValues));

    pstMuCircles.exit().remove();

    const md = Number((meanPostValues - meanPreValues).toFixed(1));
    const differences = data.map(d => d.post - d.pre);
    const meanDifference = Math.round(md * 10) / 10;
    const stdDevDifference = standardDeviation(differences);
    const Tval = Math.round(meanDifference / (stdDevDifference / Math.sqrt(n)) * 10) / 10;
    const cd = Number((md / ((preStdDevValues + postStdDevValues) / 2)).toFixed(1));
    const dfm1 = n - 1;
    const p = 1 - jStat.studentt.cdf(Math.abs(Tval), dfm1).toFixed(3);
    const pval = Number((p * 2).toFixed(3));

    let selectedRadioValue = getSelectedRadioButtonValue("analysis_type");

    addMeanDifferenceCircle(md, stdDevDifference, Tval, pval, cd, selectedRadioValue);
}

// Initial update of the slope chart
updateSlopeChart();

let simulationRunning = false;
let simulationInterval;

d3.select("#simulation-toggle").on("click", () => {
    simulationRunning = !simulationRunning;

    if (simulationRunning) {
        d3.select("#simulation-toggle").text("Stop Simulation");

        const updateSpeed = d3.select("#update-speed").node().value;

        simulationInterval = setInterval(() => {
            updateData();
            updateSlopeChart();
            updateScatterPlot();
        }, updateSpeed);
    } else {
        d3.select("#simulation-toggle").text("Start Simulation");
        clearInterval(simulationInterval);
    }
});

// Trigger an initial update of visualized results based on the default selected radio button
updateVisualizedResults();
