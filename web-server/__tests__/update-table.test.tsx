import React from 'react';
import { mount } from "enzyme";
import ControlsButtonUpdateTable, {ControlsButtonUpdateTableProps, ControlsButtonUpdateTableState} from '../plugins/slycat-parameter-image/js/Components/ControlsButtonUpdateTable.jsx';
interface GlobalAny extends NodeJS.Global {
    fetch: any
}
function flushPromises(): any {
    return new Promise(resolve => setImmediate(resolve));
}
const globalAny:GlobalAny = global;
describe('When loading the update table modal',() =>{
    beforeEach(() => {
        globalAny.fetch.resetMocks()
    });
    test('We expect props on initial load', async () => {
        const properties: ControlsButtonUpdateTableProps = {
            button_style: 'btn-outline-dark',
            mid: '123',
            pid: '456'
        };
        const render = await mount(
            <ControlsButtonUpdateTable
                {...properties}
            />
        );
        const props = render.props() as ControlsButtonUpdateTableProps;
        expect(props).toMatchSnapshot();
    });

    test('We have proper state', async () => {
        const properties: ControlsButtonUpdateTableProps = {
            button_style: 'btn-outline-dark',
            mid: '123',
            pid: '456'
        };
        const render = await mount(
            <ControlsButtonUpdateTable
                {...properties}
            />
        );
        const state = render.state() as ControlsButtonUpdateTableState;
        expect(state).toMatchSnapshot();
    });

    test('We can clean up state', async () => {
        const properties: ControlsButtonUpdateTableProps = {
            button_style: 'btn-outline-dark',
            mid: '123',
            pid: '456'
        };
        const render = await mount(
            <ControlsButtonUpdateTable
                {...properties}
            />
        );
        const instance:any = render.instance() as any;
        jest.spyOn(instance, 'cleanup');
        const initialState = instance.state;
        await instance.cleanup();
        expect(instance.cleanup).toHaveBeenCalled();
        const cleanedState = instance.state;
        expect(initialState).toEqual(cleanedState);
    });
});