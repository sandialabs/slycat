import { mount } from "enzyme";
import checkColumns from "utils/check-columns";

interface GlobalAny extends NodeJS.Global {
	fetch: any
}
function flushPromises(): any {
	return new Promise(resolve => setTimeout(resolve, 0));
}

const globalAny:GlobalAny = global;
describe('When checking columns in new table', () => {
	beforeEach(() => {
		globalAny.fetch.resetMocks();
	});
	test('We check the columns in a new remote table', async () => {
		const file = 'one, two, three\n';
		const selectedOption = 'remote';
		const mid = '123';

		globalAny.fetch.mockResponse(JSON.stringify({ "column-names": ["test1, test2, test3"] }));
		await flushPromises();
		const result = await checkColumns(file, selectedOption, mid);
		console.log(JSON.stringify(result));
		// expect(checkColumns).toHaveBeenCalled();

	})
	test('We check the columns in a new local table', async () => {
		const file = new Blob(["test1, test2, test3\n"], {type: "text/csv"});
		//const file = new File([["test1, test2, test3\n"]], "cars.csv", {type: "text/csv"});
		const selectedOption = 'local';
		const mid = '123';

		globalAny.fetch.mockResponse(JSON.stringify({ "column-names": ["test1, test2, test3"] }));
		await flushPromises();
		const result = await checkColumns(file, selectedOption, mid);
		await flushPromises();
		expect(result).toBeTruthy();
	})
})