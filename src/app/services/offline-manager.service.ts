import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { switchMap, finalize } from 'rxjs/operators';
import { forkJoin, Observable, from, of } from 'rxjs';

const STORAGE_REQ_KEY = 'storedreq';

interface StoredRequest {
  url: string,
  type: string,
  data: any,
  time: number,
  id: string
}

@Injectable({
  providedIn: 'root'
})
export class OfflineManagerService {
  
  constructor(
    private storage: Storage,
    private toastController: ToastController,
    private http: HttpClient
  ) { }

  checkForEvents(): Observable<any> {
    return from(this.storage.get(STORAGE_REQ_KEY)).pipe(
      switchMap(storedOperations => {
        let storedObj = JSON.parse(storedOperations);
        if ( storedObj && storedObj.length > 0 ) {
          return this.sendRequests(storedObj).pipe(
            finalize(() => {
              let toast = this.toastController.create({
                message: `Local data successfully synced to API!`,
                duration: 3000,
                position: 'bottom'
              });
              toast.then(toast => toast.present());
              this.storage.remove(STORAGE_REQ_KEY);
            })
          );
        } else {
          console.log('no local events');
          return of(false);
        }
      })
    );
  }

  storedRequest(url, type, data) {
    let toast = this.toastController.create({
      message: `Your data is stored locally because you seem to be offline.`,
      duration: 3000,
      position: 'bottom'
    });
    toast.then(toast => toast.present());

    let action: StoredRequest = {
      url: url,
      type: type,
      data: data,
      time: new Date().getTime(),
      id: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
    };
    
    return this.storage.get(STORAGE_REQ_KEY).then(storedOperations => {
      let storedOBj = JSON.parse(storedOperations);
      if ( storedOBj ) {
        storedOBj.push(action);
      } else {
        storedOBj = [action];
      }
      console.log('local request stored: ', action);
      return this.storage.set(STORAGE_REQ_KEY, JSON.stringify(storedOBj));
    });
  }

  sendRequests(operations: StoredRequest[]) {
    let obs = [];
    for ( let op of operations ) {
      console.log('Make one request: ', op);
      let oneObs = this.http.request(op.type, op.url, op.data);
      obs.push(oneObs);
    }
    return forkJoin(obs);
  }
}
