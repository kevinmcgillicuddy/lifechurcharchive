const functions = require('firebase-functions');
const speech = require('@google-cloud/speech').v1p1beta1; //beta version needed until stable supports mp3 encoding - https://cloud.google.com/speech-to-text/docs/reference/rest/v1p1beta1/RecognitionConfig#AudioEncoding
const admin = require('firebase-admin');
admin.initializeApp();

exports.transcribe = functions.runWith({
  timeoutSeconds: 360
}).https.onCall((data, context) => {

  const client = new speech.SpeechClient();
  const gcsUri = data.file;
  const uuid = data.uuid;
  const year = data.year;
  const encoding = 'MP3'
  const sampleRateHertz = 16000;
  const languageCode = 'en-US';

  const config = {
    encoding,
    sampleRateHertz,
    languageCode,
  };

  const audio = {
    uri: gcsUri,
  };

  const request = {
    config,
    audio
  };

  async function time() {
   
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Only authenticated users can vote up requests'
      );
    }
    //show how many times each user has asking for transcription 
    const user = admin.firestore().collection('users-list').doc(context.auth.uid)
    console.log(user)
    user.update({
      textRequests: admin.firestore.FieldValue.increment(1)
    })

    const [operation] = await client.longRunningRecognize(request);
    const [response] = await operation.promise();
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    return transcription;
  }

  time().then((transcription) => {
    return admin.firestore().collection('sermons').doc(year).collection('items').doc(uuid).update({
      text: transcription,
    }, { merge: true })
  })
    .catch((err) => {
      console.log('err' + err)
      return {
        text: `Catch Error: ${err}`
      }
    })

})

