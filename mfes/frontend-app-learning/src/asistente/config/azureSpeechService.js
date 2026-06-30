import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export class AzureSpeechService {
  constructor(subscriptionKey, region) {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
  }

  async textToSpeech(text, voiceName = 'es-MX-DaliaNeural') {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.subscriptionKey,
      this.region,
    );

    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const visemes = [];

    synthesizer.visemeReceived = (s, e) => {
      visemes.push({
        audioOffset: e.audioOffset / 10000000,
        visemeId: e.visemeId,
      });
    };

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioDuration = result.audioDuration / 10000000;
            const lipSyncData = this.convertVisemesToARKit(visemes, audioDuration);

            synthesizer.close();
            resolve({
              audioData: result.audioData,
              lipSyncData,
              duration: audioDuration,
            });
          } else {
            synthesizer.close();
            reject(new Error(`Error en síntesis: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(error);
        },
      );
    });
  }

  convertVisemesToARKit(visemes, totalDuration) {
    const azureToARKit = {
      0: 'X',
      1: 'A',
      2: 'E',
      3: 'A',
      4: 'F',
      5: 'A',
      6: 'C',
      7: 'D',
      8: 'B',
      9: 'E',
      10: 'F',
      11: 'F',
      12: 'D',
      13: 'C',
      14: 'C',
      15: 'C',
      16: 'B',
      17: 'B',
      18: 'G',
      19: 'G',
      20: 'H',
      21: 'C',
    };

    return visemes.map((viseme, index, array) => ({
      start: viseme.audioOffset,
      end: array[index + 1]?.audioOffset || totalDuration,
      value: azureToARKit[viseme.visemeId] || 'X',
    }));
  }

  static getSpanishVoices() {
    return {
      'es-MX-DaliaNeural': 'Femenina - México',
      'es-MX-JorgeNeural': 'Masculina - México',
      'es-ES-ElviraNeural': 'Femenina - España',
      'es-ES-AlvaroNeural': 'Masculina - España',
      'es-AR-ElenaNeural': 'Femenina - Argentina',
      'es-AR-TomasNeural': 'Masculina - Argentina',
      'es-CO-SalomeNeural': 'Femenina - Colombia',
      'es-CO-GonzaloNeural': 'Masculina - Colombia',
    };
  }
}
