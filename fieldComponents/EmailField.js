import React, { Component } from 'react'
import { View, Text, TextInput } from 'react-native'

export default class EmailField extends Component {
    constructor(props) {
        super(props)
        this.data = this.props.data
        this.handleChange = this.handleChange.bind(this)
        this.style = this.props.style
    }

    handleChange(text) {
        this.props.onChange(this.data.id, text)
    }

    render() {
        return (
            <View style={[this.style.fieldWrapper, this.style.textFieldWrapper]}>
                {this.data.label.length > 0 &&
                    <Text style={[this.style.fieldLabel, this.style.emailFieldLabel]}>{this.data.label}</Text>
                }
                {this.data.description.length > 0 &&
                    <Text style={[this.style.fieldDescription, this.style.emailFieldDescription]}>{this.data.description}</Text>
                }
                <TextInput
                    style={[this.style.fieldInput, this.style.textFieldInput]}
                    onChangeText={(text) => this.handleChange(text)}
                    placeholder={this.data.placeholder}
					value={this.props.value}
					{...this.props.fieldProps}
                />
            </View>
        )
    }
}
