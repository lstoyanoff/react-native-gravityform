import React, { Component } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
// import ValidationComponent from 'react-native-form-validator'
import base64 from 'react-native-base64'
import {
    AddressField,
    CheckboxField,
    EmailField,
    HiddenField,
    HtmlField,
    NameField,
    NumberField,
    PhoneField,
    RadioField,
    SectionField,
    SelectField,
    TextField,
    TextAreaField,
} from './fieldComponents'

export default class GravityForm extends Component {
    constructor(props) {
        super(props)
        this.siteURL = this.props.siteURL
        this.formID = this.props.formID || this.props.formData.id
        const credentials = this.props.credentials
        if(typeof credentials.token !== 'undefined') {
          this.authorization = `Bearer ${credentials.token}`
        } else {
          this.authorization = 'Basic ' + base64.encode(`${credentials.userName}:${credentials.password}`)
        }
        this.style = this.props.style
        this.state = {
            formData: {},
            fieldValues: {},
            isLoading: true,
            isSending: false,
            submitSuccess: false,
            submitFailure: false,
        }
        this.handleFieldChange = this.handleFieldChange.bind(this)
        this.fieldsProps = this.props.fieldsProps || {};
        this.loaderProps = this.props.loaderProps || {};
    }

    componentDidMount() {
        this.fetchFormData()
            .then(formData => {
                this.setState({ formData })
                return this.setDefaultValues(formData)
            })
            .then(() => this.setState({ isLoading: false }))
            .catch(err => console.warn('There was a problem retrieving form data: ', err))
    }

    fetchFormData() {
        return new Promise((resolve, reject) => {
          if(this.props.formData !== 'undefined') {
            resolve(this.props.formData);
          } else {
            fetch(`${this.siteURL}/wp-json/gf/v2/forms/${this.formID}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization,
                }
            })
                .then(response => response.json().then(formData => resolve(formData)))
                .catch(err => reject('ERROR: ', err))
          }
        })
    }

    values = {}

    setDefaultValues(formData) {
        return new Promise((resolve, reject) => {
            let fieldCount = formData.fields.length
            formData.fields.forEach(field => {
                switch (field.type) {
                    case 'html':
                    case 'section':
                        fieldCount--
                        break

                    case 'name':
                    case 'address':
                        fieldCount = fieldCount + field.inputs.length
                        this.populateComplexValues(field)
                        break

                    case 'checkbox':
                        fieldCount = fieldCount + field.inputs.length
                        this.populateCheckboxValues(field)
                        break

                    case 'radio':
                    case 'select':
                        this.populateChoiceValues(field)
                        break

                    default:
                        if (field.id == '36') console.log(field)
                        this.populateSimpleValue(field)
                        break
                }
            })
            if (Object.keys(this.state.fieldValues).length == fieldCount) resolve()
            setTimeout(() => reject('"setDefaultValues" function timed out. Field values never populated completely.'), 5000)
        })
    }

    populateComplexValues(field) {
        field.inputs.forEach(input => {
            if (input.choices) {
                const selected = input.choices.filter(choice => choice.isSelected)
                this.setState({
                    fieldValues: {
                        ...this.state.fieldValues,
                        [input.id]: selected.length ? selected[0].value : '',
                        [field.id]: {
                            ...this.state.fieldValues[field.id],
                            [input.id]: selected[0] ? selected[0].value : ''
                        }
                    }
                })
            } else {
                this.setState({
                    fieldValues: {
                        ...this.state.fieldValues,
                        [input.id]: input.defaultValue ? input.defaultValue : '',
                        [field.id]: {
                            ...this.state.fieldValues[field.id],
                            [input.id]: input.defaultValue ? input.defaultValue : ''
                        }
                    }
                })
            }
        })
    }

    populateCheckboxValues(field) {
        field.inputs.forEach((input, index) => {
            this.setState({
                fieldValues: {
                    ...this.state.fieldValues,
                    [input.id]: field.choices[index].isSelected ? field.choices[index].value : false,
                    [field.id]: {
                        ...this.state.fieldValues[field.id],
                        [input.id]: field.choices[index].isSelected ? field.choices[index].value : false,
                    }
                }
            })
        })
    }

    populateChoiceValues(field) {
        const selected = field.choices.filter(choice => {
            return choice.isSelected
        })
        this.setState({ fieldValues: { ...this.state.fieldValues, [field.id]: selected.length ? selected[0].value : '' } })
    }

    populateSimpleValue(field) {
        this.setState({ fieldValues: { ...this.state.fieldValues, [field.id]: field.defaultValue } })
    }

    fieldHidden(field) {
        if (field.visibility != 'visible') return true
        if (typeof field.conditionalLogic == 'object' && field.conditionalLogic !== null) {
            return this.handleConditionalLogic(field)
        }
        return false
    }

    handleConditionalLogic(field) {
        const rulesMet = field.conditionalLogic.rules.map(rule => {
            let conditionalValue = this.state.fieldValues[rule.fieldId]
            if (typeof conditionalValue == 'object') {
                matchKey = Object.keys(conditionalValue).filter(key => this.state.fieldValues[key] == rule.value)[0]
                conditionalValue = matchKey ? this.state.fieldValues[matchKey] : false
            }
            switch (rule.operator) {
                case 'is':
                    return conditionalValue == rule.value

                case 'is not':
                    return conditionalValue != rule.value

                case 'greater than':
                    return conditionalValue > rule.value

                case 'less than':
                    return conditionalValue < rule.value

                case 'contains':
                    return conditionalValue.indexOf(rule.value) >= 0

                case 'starts with':
                    return conditionalValue.indexOf(rule.value) == 0

                case 'ends with':
                    return conditionalValue.indexOf(rule.value) == conditionalValue.length - rule.value.length

            }
        })
        if (field.conditionalLogic.actionType == 'show') {
            return field.conditionalLogic.logicType == 'all' ? rulesMet.indexOf(false) >= 0 : rulesMet.indexOf(true) < 0
        } else {
            return field.conditionalLogic.logicType == 'all' ? rulesMet.indexOf(true) < 0 : rulesMet.indexOf(false) >= 0
        }
    }

    handleFieldChange(fieldId, value, inputId) {
        if (inputId) {
            this.setState({
                fieldValues: {
                    ...this.state.fieldValues,
                    [inputId]: value,
                    [fieldId]: {
                        ...this.state.fieldValues[fieldId],
                        [inputId]: value,
                    },
                }
            })
        } else {
            this.setState({
                fieldValues: {
                    ...this.state.fieldValues,
                    [fieldId]: value,
                }
            })
        }
    }

    submitForm() {
        this.setState({ isSending: true })
        let formData = {}
        let fieldCount = Object.keys(this.state.fieldValues).length
        Object.keys(this.state.fieldValues).forEach(key => {
            if (typeof this.state.fieldValues[key] == 'object' && this.state.fieldValues[key] !== null) {
                fieldCount--
            } else {
                formData = { ...formData, [key]: this.state.fieldValues[key] }
            }
            if (Object.keys(formData).length == fieldCount) this.postFormData(formData)
        })
    }

    postFormData(formData) {
        fetch(`${this.siteURL}/wp-json/gf/v2/forms/${this.formID}/entries`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': this.authorization,
            },
            body: JSON.stringify(formData),
        })
            .then(() => this.setState({ isSending: false, submitSuccess: true }))
            .catch(err => console.error('ERROR: ', err));
    }

    fieldComponents = {
        address: AddressField,
        checkbox: CheckboxField,
        email: EmailField,
        hidden: HiddenField,
        html: HtmlField,
        name: NameField,
        number: NumberField,
        phone: PhoneField,
        radio: RadioField,
        section: SectionField,
        select: SelectField,
        text: TextField,
        textarea: TextAreaField,
    }

    render() {
        if (this.state.isLoading) {
            return (
                <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator {...this.loaderProps} />
                </View>
            )
        }
        if (this.state.isSending) {
            return (
                <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator {...this.loaderProps} />
                </View>
            )
        }
        if (this.state.submitSuccess) {
            return (
                <View style={this.style.confirmationWrapper}>
                    <Text style={this.style.confirmationText}>
                      {this.state.formData.confirmations[Object.keys(this.state.formData.confirmations)[0]].message}
                    </Text>
                </View>
            )
        }
        let parentHidden = false
        const fields = this.state.formData.fields && this.state.formData.fields.map((field) => {
            if (Object.keys(this.fieldComponents).indexOf(field.type) < 0) {
                console.warn(`React Native Gravityform: No field component currently available for type "${field.type}".`)
                return
            }
            const FieldComponent = this.fieldComponents[field.type || 'text']
            if (field.type == 'section') parentHidden = this.fieldHidden(field)
            return (
                <View
                    key={field.id.toString()}
                    style={{ display: this.fieldHidden(field) || parentHidden ? 'none' : 'flex' }}
                >
                    <FieldComponent
                        data={field}
                        onChange={this.handleFieldChange}
                        style={this.style}
                        value={this.state.fieldValues[field.id]}
                        fieldProps={this.fieldsProps[field.type]}
                    />
                </View>
            )
        })

        const showFormTitle = this.state.formData.title.length > 0 && !this.props.hideFormTitle;
        const showFormDescription = this.state.formData.description.length > 0 && !this.props.hideFormDescription;

        return (
            <KeyboardAwareScrollView style={this.style.formWrapper}>
                {(showFormTitle || showFormDescription) &&
                    <View style={this.style.formHeader}>
                        {showFormTitle &&
                            <Text style={this.style.formTitle}>{this.state.formData.title}</Text>
                        }

                        {showFormDescription &&
                            <Text style={this.style.formDescription}>{this.state.formData.description}</Text>
                        }
                    </View>
                }
                <View style={this.style.formBody}>
                    {fields}
                </View>
                {this.state.formData.button &&
                    <View style={this.style.formFooter}>
                        <TouchableOpacity onPress={() => this.submitForm()} style={this.style.button}>
                            <Text style={this.style.buttonText}>{this.state.formData.button.text}</Text>
                        </TouchableOpacity>
                    </View>
                }
            </KeyboardAwareScrollView>
        )
    }
}