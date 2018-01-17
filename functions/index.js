const functions = require('firebase-functions')
const Mailerlite = require('mailerlite')
const SparkPost = require('sparkpost')
// const admin = require('firebase-admin')
// const stripe = require('stripe')(functions.config().stripe.token)

// Configure Mailerlite
const mailerlite = new Mailerlite(functions.config().mailerlite.key)
const mailerliteListId = '8738992'
const mailerliteSubscribers = mailerlite.Subscribers

// Configure stripe
// stripe.currency = functions.config().stripe.currency || 'USD'

// Subscribe a user to mailerLite according to his settings.
exports.subscribeUserToMailerlite = functions.database.ref('/accounts/{uid}').onWrite(event => {
  const snapshot = event.data
  const val = snapshot.val()

  if (!snapshot.changed('subscribedToMailingList')) {
    return null
  }

  const message = `${val.email} to mailing list`
  console.log(val.subscribedToMailingList ? `Subscribe ${message}` : `Unsubscribe ${message}`)
  return val.subscribedToMailingList ? subscribeUserToMailerList(val, mailerliteListId) : UnSubscribeUserToMailerList(val, mailerliteListId)
})

// Sends an email to the user when he forget his password.
exports.sendEmailForgetPassword = functions.database.ref('/users/{uid}').onWrite(event => {
  const snapshot = event.data
  const val = snapshot.val()

  if (!snapshot.changed('forgetPassword')) {
    return null
  }

  const client = new SparkPost(functions.config().sparkpost.key)
  client.transmissions.send({
    transmissionBody: {
      recipients: [{ address: { email: val.email } }],
      content: {
        template_id: 'my-first-email'
      },
      substitution_data: {'name': val.displayName},
      campaign_id: 'welcome'
    }
  }, (err, res) => {
    if (err) {
      console.log(err.stack)
    } else {
      console.log(`Email Sent for test to ${val.email}`)
    }
  })
})

exports.createCustomer = functions.auth.user().onCreate(event => {
  // user auth data
  const user = event.data
  const displayName = user.displayName

  return mailerliteSubscribers.addSubscriber(mailerliteListId, user.email, displayName, {}, 1)
    .then((res) => {
      console.log(res)
    })

  // register Stripe user
  // return stripe.customers.create({
  //   email: user.email
  // })
  //   .then(customer => {
  //     // update database with stripe customer id
  //     const updates = {}
  //     updates[`/customers/${customer.id}`] = user.uid
  //     updates[`/users/${user.uid}/customerId`] = customer.id
  //     return admin.database().ref().update(updates)
  //   })
})

function subscribeUserToMailerList (user, mailerliteListId) {
  return mailerliteSubscribers.addSubscriber(mailerliteListId, user.email, user.displayName, {}, 1)
    .then((res) => {
      console.log(res)
    })
}

function UnSubscribeUserToMailerList (user, mailerliteListId) {
  return mailerliteSubscribers.deleteSubscriber(mailerliteListId, user.email)
    .then((res) => {
      console.log(res)
    })
}
