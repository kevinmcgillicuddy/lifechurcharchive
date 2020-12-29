import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFireStorage } from '@angular/fire/storage';
import firebase from 'firebase/app';
import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

class UploadResult {
  uploadPercent?: Observable<number>;
  downloadURL?: Observable<string>;
  feedback?:string;
  metadata:object;
  fileName:string;
}

@Injectable({
  providedIn: 'root'
})

export class FirebaseService {

  constructor(public db: AngularFirestore, public storage: AngularFireStorage, public func:AngularFireFunctions, public auth: AngularFireAuth) { }

  
  sendFileForTranscription(data) {
    // event.target.disabled = true;
    // this.loading = true
    const transcribe = this.func.httpsCallable("transcribe")
    transcribe(
      {file:data.gsurl,
      uuid:data.uuid.customMetadata.uuid,
      contentType: data.uuid.contentType
    }).toPromise().catch(err=>console.log('error '+err))
  }

  private generateUUID() {
    return Math.random().toString(36).substring(2);
  }
  private itemDoc: AngularFirestoreDocument<string>;
  item: Observable<string>;


  getText(uuid:string):Promise<any>{
    return this.db.collection('sermons').ref.where(`metadata.uuid`,'==',`${uuid}`).get()
   }

  uploadFile(event,yearPicked): UploadResult {
    if (!yearPicked) {yearPicked === 2019} 
      const uuid = this.generateUUID();
      const file = event.target.files[0];
      const filePath = `mp3/${yearPicked}/${file.name}`;
      const metadata = {uuid, gsurl: `gs://lcarchivewebsite.appspot.com/${filePath}` }
      const task = this.storage.upload(filePath, file, {customMetadata: metadata });
      console.log(task)
       return {
        metadata,
        fileName: file.name,
        uploadPercent: task.percentageChanges(),
        downloadURL: task.snapshotChanges().pipe(
          mergeMap(snapshot => {
            return from(snapshot.ref.getDownloadURL())
          })
        )
      };
  }
  
  login() {
    this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }
  logout() {
    this.auth.signOut();
  }

  createFirestoreRecord(value):void{
    this.db.collection('sermons').doc(value.metadata.uuid).set(value)  
  }

  getFolders():Observable<any>{
    return of([2018,2019,2020])
    // return this.storage.ref('/mp3/').listAll()
  }

  getSermonFilesRecords(year:string):Promise<any>{
   return  this.db.collection('sermons').ref.where(`year`,'==',`${year}`).get()
  }

}