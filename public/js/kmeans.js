const MAX_ITERATIONS = 50;
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function calcMeanCentroid(dataSet, start, end) {
    const features = dataSet[0].length;
    const n = end - start;
    let mean = Array();
    for (let i = 0; i < features; i++) {
        mean.push(0);
    }
    for (let i = start; i < end; i++) {
        for (let j = 0; j < features; j++) {
            mean[j] = mean[j] + dataSet[i][j] / n;
        }
    }
    return mean;
}
function getRandomCentroidsNaiveSharding(dataset, k) {
    const numSamples = dataset.length;
    const step = Math.floor(numSamples / k);
    const centroids = Array();
    for (let i = 0; i < k; i++) {
        const start = step * i;
        let end = step * (i + 1);
        if (i + 1 === k) {
            end = numSamples;
        }
        centroids.push(calcMeanCentroid(dataset, start, end));
    }
    return centroids;
}
function getRandomCentroids(dataset, k) {
    const numSamples = dataset.length;
    const centroidsIndex = Array();
    let index;
    while (centroidsIndex.length < k) {
        index = randomBetween(0, numSamples);
        if (centroidsIndex.indexOf(index) === -1) {
            centroidsIndex.push(index);
        }
    }
    const centroids = Array();
    for (let i = 0; i < centroidsIndex.length; i++) {
        const centroid = [...dataset[centroidsIndex[i]]];
        centroids.push(centroid);
    }
    return centroids;
}
function compareCentroids(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
function shouldStop(oldCentroids, centroids, iterations) {
    if (iterations > MAX_ITERATIONS) {
        return true;
    }
    if (!oldCentroids || !oldCentroids.length) {
        return false;
    }
    let sameCount = true;
    for (let i = 0; i < centroids.length; i++) {
        if (!compareCentroids(centroids[i], oldCentroids[i])) {
            sameCount = false;
        }
    }
    return sameCount;
}
function getDistanceSQ(a, b) {
    const diffs = Array();
    for (let i = 0; i < a.length; i++) {
        diffs.push(a[i] - b[i]);
    }
    return diffs.reduce((r, e) => r + e * e, 0);
}
function getLabels(dataSet, centroids) {
    const labels = new Map();
    for (let c = 0; c < centroids.length; c++) {
        labels[c] = {
            points: [],
            centroid: centroids[c],
        };
    }
    for (let i = 0; i < dataSet.length; i++) {
        const a = dataSet[i];
        let closestCentroid, closestCentroidIndex = 0, prevDistance = Infinity;
        for (let j = 0; j < centroids.length; j++) {
            let centroid = centroids[j];
            if (j === 0) {
                closestCentroid = centroid;
                closestCentroidIndex = j;
                prevDistance = getDistanceSQ(a, closestCentroid);
            }
            else {
                const distance = getDistanceSQ(a, centroid);
                if (distance < prevDistance) {
                    prevDistance = distance;
                    closestCentroid = centroid;
                    closestCentroidIndex = j;
                }
            }
        }
        labels[closestCentroidIndex].points.push(a);
    }
    return labels;
}
function getPointsMean(pointList) {
    const totalPoints = pointList.length;
    const means = Array();
    for (let j = 0; j < pointList[0].length; j++) {
        means.push(0);
    }
    for (let i = 0; i < pointList.length; i++) {
        const point = pointList[i];
        for (let j = 0; j < point.length; j++) {
            const val = point[j];
            means[j] = means[j] + val / totalPoints;
        }
    }
    return means;
}
function recalculateCentroids(dataSet, labels) {
    let newCentroid;
    const newCentroidList = new Array();
    for (const k in labels) {
        const centroidGroup = labels[k];
        if (centroidGroup.points.length > 0) {
            newCentroid = getPointsMean(centroidGroup.points);
        }
        else {
            newCentroid = getRandomCentroids(dataSet, 1)[0];
        }
        newCentroidList.push(newCentroid);
    }
    return newCentroidList;
}
function kmeans(dataset, k, useNaiveSharding = true) {
    if (dataset.length && dataset[0].length && dataset.length > k) {
        let iterations = 0;
        let oldCentroids = new Array(), labels = new Map(), centroids = new Array();
        if (useNaiveSharding) {
            centroids = getRandomCentroidsNaiveSharding(dataset, k);
        }
        else {
            centroids = getRandomCentroids(dataset, k);
        }
        while (!shouldStop(oldCentroids, centroids, iterations)) {
            oldCentroids = [...centroids];
            iterations++;
            labels = getLabels(dataset, centroids);
            centroids = recalculateCentroids(dataset, labels);
        }
        const clusters = new Array();
        for (let i = 0; i < k; i++) {
            clusters.push(labels[i]);
        }
        const results = {
            clusters: clusters,
            centroids: centroids,
            iterations: iterations,
            converged: iterations <= MAX_ITERATIONS,
        };
        return results;
    }
    else {
        throw new Error("Invalid dataset");
    }
}
export { kmeans };
//# sourceMappingURL=kmeans.js.map