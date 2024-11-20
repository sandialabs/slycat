'use strict';
import * as React from 'react';
import MappingRadioButton from 'components/MappingRadioButton';
import SlycatRemoteControls from 'components/SlycatRemoteControls.jsx';

interface SelectColumnsTabProps {
    attributes: Array<string>,
    classification: Array<string>
    categorical: boolean
    editable: boolean
    checked: string
    onChange: Function
    selectedColumns: Array<string>
}

function SelectColumnsTab(props: SelectColumnsTabProps) {
    return (
        <div>
            <table>
                <thead>
                    <tr>
                        {props.classification.map((val,idx)=>(
                            <th className="bool property-start property-end" key={idx}>
                                <span key={idx} className='genre'>{val}</span>
                                <i className="fa fa-toggle-on select-all-button button"></i>
                            </th>
                        ))}
                    </tr>
                </thead>
                {props.attributes.map((val,idx)=>(
                    <tbody key={idx}>
                        <tr>
                            <th key={idx}>{val}</th>
                            <td className="select">
                                <MappingRadioButton
                                    checked={props.checked === 'input'}
                                    onChange={() => {props.onChange(val, 'input')}}
                                    value={'input'}
                                    text={''}
                                    idx={idx}
                                    name={val}
                                />
                            </td>
                            <td className="select">
                                <MappingRadioButton
                                    checked={props.checked === 'output'}
                                    onChange={() => {props.onChange(val, 'output')}}
                                    value={'output'}
                                    text={''}
                                    idx={idx}
                                    name={val}
                                />                            
                            </td>
                            <td className="select">
                                <MappingRadioButton
                                    checked={props.checked === 'neither'}
                                    onChange={() => {props.onChange(val, 'neither')}}
                                    value={'neither'}
                                    text={''}
                                    idx={idx}
                                    name={val}
                                />                            
                            </td>
                            <td className="bool property-start property-end">
                                <input id="categorical" type="checkbox"/>
                            </td>
                            <td className="bool property-start property-end">
                                <input id="editable" type="checkbox"/>
                            </td>
                        </tr>
                    </tbody>
                    ))}
            </table>
        </div>
    );
}

export default SelectColumnsTab