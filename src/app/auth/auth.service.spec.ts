import {AuthService} from './auth.service';
import {TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {AuthRequest} from './model/auth-request.model';
import {validAuthRequestMock} from '../../testing/mocks/auth-request.mock';
import {AuthResponse} from './model/auth-response.model';
import {environment} from '../../env/environment';
import {validAuthResponseMock} from '../../testing/mocks/user.mock';

describe('AuthService', () => {
  let service: AuthService;
  let httpController: HttpTestingController;
  const endpoint = `${environment.apiHost}/auth/registration`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  })

  it('should send POST request and return registered user', () => {
    const request: AuthRequest = validAuthRequestMock;
    const mockResponse: AuthResponse = validAuthResponseMock;

    service.registerUser(request).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpController.expectOne(endpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);

    req.flush(mockResponse);
  });

  it('should return validation errors on bad request', () => {
    const request = validAuthRequestMock;
    service.registerUser(request).subscribe({
      next: () => fail('Expected validation error'),
      error: (err) => {
        expect(err.status).toBe(400);
        expect(err.error.message).toContain('Validation');
      }
    });

    const req = httpController.expectOne(endpoint);
    expect(req.request.url).toBe(endpoint);
    expect(req.request.body).toEqual(request);

    req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle 500 server error gracefully', () => {
    const request = validAuthRequestMock;
    service.registerUser(request).subscribe({
      next: () => fail('Expected error 500, but got success'),
      error: (err) => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpController.expectOne(endpoint);
    expect(req.request.url).toBe(endpoint);
    expect(req.request.body).toEqual(request);

    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
  });

  it('should send POST request with FormData and return text response', () => {
    const userId = 1;
    const mockFile = new File(['dummy content'], 'profile.jpg', { type: 'image/jpeg' });
    const expectedResponse = 'Photo uploaded successfully';

    service.uploadProfilePhoto(userId, mockFile).subscribe(response => {
      expect(response).toBe(expectedResponse);
    });

    const req = httpController.expectOne(`${environment.apiHost}/auth/${userId}/profile-photo`);
    expect(req.request.url).toBe(`${environment.apiHost}/auth/${userId}/profile-photo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();

    const formData = req.request.body as FormData;
    expect(formData.has('profilePhoto')).toBeTrue();

    req.flush(expectedResponse);
  });

  it('should return error when upload fails with 500', () => {
    const userId = 1;
    const mockFile = new File(['dummy content'], 'profile.jpg', { type: 'image/jpeg' });

    service.uploadProfilePhoto(userId, mockFile).subscribe({
      next: () => fail('Expected 500 server error'),
      error: (err) => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpController.expectOne(`${environment.apiHost}/auth/${userId}/profile-photo`);
    expect(req.request.url).toBe(`${environment.apiHost}/auth/${userId}/profile-photo`);
    expect(req.request.method).toBe('POST');

    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
  });

});
