const MAX_ITERATIONS = 50;

type Point = number[];
type Points = Point[];
type Label = {
    points: Points;
    centroid: Point;
};

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

function calcMeanCentroid(dataSet: Points, start: number, end: number) {
    const features = dataSet[0].length;
    const n = end - start;
    let mean = Array<number>();
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

function getRandomCentroidsNaiveSharding(dataset: Points, k: number) {
    // implementation of a variation of naive sharding centroid initialization method
    // (not using sums or sorting, just dividing into k shards and calc mean)
    // https://www.kdnuggets.com/2017/03/naive-sharding-centroid-initialization-method.html
    const numSamples = dataset.length;
    // Divide dataset into k shards:
    const step = Math.floor(numSamples / k);
    const centroids = Array<number[]>();
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

function getRandomCentroids(dataset: Points, k: number) {
    // selects random points as centroids from the dataset
    const numSamples = dataset.length;
    const centroidsIndex = Array<number>();
    let index: number;
    while (centroidsIndex.length < k) {
        index = randomBetween(0, numSamples);
        if (centroidsIndex.indexOf(index) === -1) {
            centroidsIndex.push(index);
        }
    }
    const centroids = Array<number[]>();
    for (let i = 0; i < centroidsIndex.length; i++) {
        const centroid = [...dataset[centroidsIndex[i]]];
        centroids.push(centroid);
    }
    return centroids;
}

function compareCentroids(a: number[], b: number[]) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

function shouldStop(
    oldCentroids: Points,
    centroids: Points,
    iterations: number
) {
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

// Calculate Squared Euclidean Distance
function getDistanceSQ(a: Point, b: Point) {
    const diffs = Array<number>();
    for (let i = 0; i < a.length; i++) {
        diffs.push(a[i] - b[i]);
    }
    return diffs.reduce((r, e) => r + e * e, 0);
}

// Returns a label for each piece of data in the dataset.
function getLabels(dataSet: Points, centroids: Points) {
    // prep data structure:
    const labels = new Map<number, Label>();
    for (let c = 0; c < centroids.length; c++) {
        labels[c] = {
            points: [],
            centroid: centroids[c],
        };
    }
    // For each element in the dataset, choose the closest centroid.
    // Make that centroid the element's label.
    for (let i = 0; i < dataSet.length; i++) {
        const a = dataSet[i];
        let closestCentroid: Point,
            closestCentroidIndex: number = 0,
            prevDistance: number = Infinity;
        for (let j = 0; j < centroids.length; j++) {
            let centroid = centroids[j];
            if (j === 0) {
                closestCentroid = centroid;
                closestCentroidIndex = j;
                prevDistance = getDistanceSQ(a, closestCentroid);
            } else {
                // get distance:
                const distance = getDistanceSQ(a, centroid);
                if (distance < prevDistance) {
                    prevDistance = distance;
                    closestCentroid = centroid;
                    closestCentroidIndex = j;
                }
            }
        }
        // add point to centroid labels:
        labels[closestCentroidIndex].points.push(a);
    }
    return labels;
}

function getPointsMean(pointList: Points) {
    const totalPoints = pointList.length;
    const means = Array<number>();
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

function recalculateCentroids(dataSet: Points, labels: Map<number, Label>) {
    // Each centroid is the geometric mean of the points that
    // have that centroid's label. Important: If a centroid is empty (no points have
    // that centroid's label) you should randomly re-initialize it.
    let newCentroid: Point;
    const newCentroidList = new Array<Point>();
    for (const k in labels) {
        const centroidGroup = labels[k];
        if (centroidGroup.points.length > 0) {
            // find mean:
            newCentroid = getPointsMean(centroidGroup.points);
        } else {
            // get new random centroid
            newCentroid = getRandomCentroids(dataSet, 1)[0];
        }
        newCentroidList.push(newCentroid);
    }
    return newCentroidList;
}

function kmeans(dataset: Points, k: number, useNaiveSharding: boolean = true) {
    if (dataset.length && dataset[0].length && dataset.length > k) {
        // Initialize book keeping variables
        let iterations = 0;
        let oldCentroids = new Array<Point>(),
            labels = new Map<number, Label>(),
            centroids = new Array<Point>();

        // Initialize centroids randomly
        if (useNaiveSharding) {
            centroids = getRandomCentroidsNaiveSharding(dataset, k);
        } else {
            centroids = getRandomCentroids(dataset, k);
        }

        // Run the main k-means algorithm
        while (!shouldStop(oldCentroids, centroids, iterations)) {
            // Save old centroids for convergence test.
            oldCentroids = [...centroids];
            iterations++;

            // Assign labels to each datapoint based on centroids
            labels = getLabels(dataset, centroids);
            centroids = recalculateCentroids(dataset, labels);
        }

        const clusters = new Array<Label>();
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
    } else {
        throw new Error("Invalid dataset");
    }
}

export { kmeans };
