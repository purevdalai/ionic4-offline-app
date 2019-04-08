import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Observable, from } from 'rxjs';
import { OfflineManagerService } from './offline-manager.service';
import { NetworkService, ConnectionStatus } from './network.service';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError } from 'rxjs/operators';

const API_STORAGE_KEY = 'specialkey';
const API_URL = 'https://reqres.in/api';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private storage: Storage,
    private http: HttpClient,
    private networkService: NetworkService,
    private offlineManagerService: OfflineManagerService
  ) { }

  getUsers(forceRefresh: boolean = false): Observable<any> {
    if ( this.networkService.getCurrentNetworkStatus() === ConnectionStatus.Offline || !forceRefresh ) {
      return from(this.getLocalData('users'));
    } else {
      let page = Math.floor(Math.random() * Math.floor(6));
      return this.http.get(`${API_URL}/users?per_page=2&page=${page}`).pipe(
        map(res => res['data']),
        tap(res => {
          console.log('returns real live API data');
          this.setLocalData('users', res);
        })
      )
    }
  }

  updateUser(user, data): Observable<any> {
    let url = `${API_URL}/users/${user}`;
    if ( this.networkService.getCurrentNetworkStatus() === ConnectionStatus.Offline ) {
      return from(this.offlineManagerService.storedRequest(url, 'PUT', data));
    } else {
      return this.http.put(url, data).pipe(
        catchError(err => {
          this.offlineManagerService.storedRequest(url, 'PUT', data);
          throw new Error(err);
        })
      )
    }
  }

  private setLocalData(key, data) {
    this.storage.set(`${API_STORAGE_KEY}-${key}`, data);
  }

  private getLocalData(key) {
    console.log('return local data!');
    return this.storage.get(`${API_STORAGE_KEY}-${key}`)
  }
}
