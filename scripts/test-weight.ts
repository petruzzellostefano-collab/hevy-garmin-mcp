import { getGarminClient } from "../lib/garmin/client";

async function main() {
    const client = await getGarminClient();
    try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30); // Last 30 days
        const startDate = start.toISOString().split("T")[0];
        const endDate = end.toISOString().split("T")[0];

        // Based on the endpoint pattern GC_API/weight-service/weight/dateRange
        const url = `https://connectapi.garmin.com/weight-service/weight/dateRange?startDate=${startDate}&endDate=${endDate}`;
        console.log(`Fetching from: ${url}`);

        const rangeData = await client.get(url);
        console.log("\nRange Data:");
        console.log(JSON.stringify(rangeData, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
main();
