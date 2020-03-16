import React, { Component } from 'react'
import { View, Text, TextInput } from 'react-native'

export default class PhoneField extends Component {
    constructor(props) {
        super(props)
        this.data = this.props.data
        this.handleChange = this.handleChange.bind(this)
        this.style = this.props.style
    }

    handleChange(number) {
        this.props.onChange(this.data.id, number)
    }

    render() {
        return (
            <View style={[this.style.fieldWrapper, this.style.phoneFieldWrapper]}>
                {this.data.label.length > 0 &&
                    <Text style={[this.style.fieldLabel, this.style.phoneFieldLabel]}>{this.data.label}</Text>
                }
                {this.data.description.length > 0 &&
                    <Text style={[this.style.fieldDescription, this.style.phoneFieldDescription]}>{this.data.description}</Text>
                }
                <TextInput
                    style={[this.style.fieldInput, this.style.phoneFieldInput]}
                    onChangeText={(number) => this.handleChange(number)}
                    placeholder={this.data.placeholder}
					value={this.props.value}
					{...this.props.fieldProps}
                />
            </View>
        )
    }
}
