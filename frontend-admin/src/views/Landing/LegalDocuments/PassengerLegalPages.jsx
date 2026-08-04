import LegalDocument from './LegalDocument'
import {
    passengerPayment,
    passengerPrivacy,
    passengerRefund,
    passengerTerms,
} from './passengerPolicies'

export const PassengerTerms = () => <LegalDocument document={passengerTerms} />
export const PassengerPrivacy = () => <LegalDocument document={passengerPrivacy} />
export const PassengerPayment = () => <LegalDocument document={passengerPayment} />
export const PassengerRefund = () => <LegalDocument document={passengerRefund} />
